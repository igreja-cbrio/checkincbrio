import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Starting Planning Center sync...');

  try {
    // Authenticate the request - require a valid JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Missing authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a client with the user's auth token to validate it
    const userSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Validate the JWT and get claims
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userSupabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('Invalid JWT token:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log(`Authenticated user: ${userId}`);

    // Now create the service role client for database operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if user has leader or admin role - only they can sync
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .in('role', ['leader', 'admin']);

    if (!roles || roles.length === 0) {
      console.error('Unauthorized: User does not have leader/admin role');
      return new Response(
        JSON.stringify({ error: 'Forbidden - Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('User authorized, proceeding with sync...');

    const appId = Deno.env.get('PLANNING_CENTER_APP_ID');
    const secret = Deno.env.get('PLANNING_CENTER_SECRET');

    if (!appId || !secret) {
      console.error('Missing Planning Center credentials');
      return new Response(JSON.stringify({ 
        error: 'Planning Center credentials not configured'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Credentials found, connecting to Planning Center API...');

    const credentials = btoa(`${appId}:${secret}`);
    const baseUrl = 'https://api.planningcenteronline.com/services/v2';

    // Test connection first
    const testRes = await fetch(`${baseUrl}/service_types`, {
      headers: { 'Authorization': `Basic ${credentials}` }
    });

    if (!testRes.ok) {
      const errorText = await testRes.text();
      console.error('Planning Center API error:', testRes.status, errorText);
      return new Response(JSON.stringify({ 
        error: 'Failed to connect to Planning Center'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const typesData = await testRes.json();
    console.log(`Found ${typesData.data?.length || 0} service types`);

    let totalServices = 0;
    let totalSchedules = 0;

    // Process service types in parallel with limited concurrency
    const processServiceType = async (serviceType: any) => {
      let typeServices = 0;
      let typeSchedules = 0;
      
      console.log(`Processing service type: ${serviceType.attributes.name}`);
      
      // Fetch only next 3 upcoming plans (reduced from 10)
      const plansRes = await fetch(
        `${baseUrl}/service_types/${serviceType.id}/plans?filter=future&per_page=3`,
        { headers: { 'Authorization': `Basic ${credentials}` } }
      );

      if (!plansRes.ok) {
        console.error(`Error fetching plans for ${serviceType.attributes.name}`);
        return { services: 0, schedules: 0 };
      }

      const plansData = await plansRes.json();
      console.log(`Found ${plansData.data?.length || 0} plans for ${serviceType.attributes.name}`);

      // Process plans in parallel
      const planPromises = (plansData.data || []).map(async (plan: any) => {
        const serviceDate = plan.attributes.sort_date;
        const serviceName = plan.attributes.title || serviceType.attributes.name;

        // Upsert service
        const { data: service, error: serviceError } = await supabaseClient
          .from('services')
          .upsert({
            planning_center_id: plan.id,
            name: serviceName,
            service_type_name: serviceType.attributes.name,
            scheduled_at: serviceDate,
          }, { onConflict: 'planning_center_id' })
          .select()
          .single();

        if (serviceError) {
          console.error('Error upserting service:', serviceError);
          return { services: 0, schedules: 0 };
        }

        typeServices++;
        console.log(`Synced service: ${serviceName} on ${serviceDate}`);

        // Fetch team members for this plan
        const teamRes = await fetch(
          `${baseUrl}/service_types/${serviceType.id}/plans/${plan.id}/team_members?per_page=100`,
          { headers: { 'Authorization': `Basic ${credentials}` } }
        );

        if (!teamRes.ok) {
          console.error(`Error fetching team for plan ${plan.id}`);
          return { services: 1, schedules: 0 };
        }

        const teamData = await teamRes.json();
        console.log(`Found ${teamData.data?.length || 0} team members`);

        // Prepare batch data for schedules
        const schedulesToUpsert: any[] = [];
        
        for (const member of teamData.data || []) {
          const memberStatus = member.attributes.status;
          if (!['C', 'U', 'D'].includes(memberStatus)) continue;

          const personId = member.relationships?.person?.data?.id || member.id;
          const statusMap: Record<string, string> = { 'C': 'confirmed', 'U': 'pending', 'D': 'declined' };
          const confirmationStatus = statusMap[memberStatus] || 'unknown';
          
          const teamPosition = member.attributes.team_position_name || '';
          const parts = teamPosition.split(' - ');
          
          schedulesToUpsert.push({
            service_id: service.id,
            planning_center_person_id: personId,
            volunteer_name: member.attributes.name,
            team_name: parts[0] || null,
            position_name: parts[1] || null,
            confirmation_status: confirmationStatus,
          });
        }

        // Batch upsert all schedules at once
        if (schedulesToUpsert.length > 0) {
          const { error: upsertError } = await supabaseClient
            .from('schedules')
            .upsert(schedulesToUpsert, { 
              onConflict: 'service_id,planning_center_person_id',
              ignoreDuplicates: false 
            });
          
          if (!upsertError) {
            typeSchedules += schedulesToUpsert.length;
          } else {
            console.error('Batch upsert error:', upsertError);
          }
        }

        return { services: 1, schedules: schedulesToUpsert.length };
      });

      await Promise.all(planPromises);
      return { services: typeServices, schedules: typeSchedules };
    };

    // Process all service types in parallel (batch of 5 at a time)
    const serviceTypes = typesData.data || [];
    const batchSize = 5;
    
    for (let i = 0; i < serviceTypes.length; i += batchSize) {
      const batch = serviceTypes.slice(i, i + batchSize);
      const results = await Promise.all(batch.map(processServiceType));
      
      for (const result of results) {
        totalServices += result.services;
        totalSchedules += result.schedules;
      }
    }

    console.log(`Sync completed: ${totalServices} services, ${totalSchedules} new schedules`);

    return new Response(JSON.stringify({ 
      success: true, 
      services: totalServices,
      newSchedules: totalSchedules 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Sync error:', message);
    return new Response(JSON.stringify({ error: 'An error occurred during sync' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
