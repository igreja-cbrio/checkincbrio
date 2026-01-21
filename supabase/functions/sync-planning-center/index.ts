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
    
    console.log('User authenticated, proceeding with sync...');

    const appId = Deno.env.get('PLANNING_CENTER_APP_ID');
    const secret = Deno.env.get('PLANNING_CENTER_SECRET');

    if (!appId || !secret) {
      console.error('Missing Planning Center credentials');
      return new Response(JSON.stringify({ 
        error: 'Planning Center credentials not configured',
        details: 'Please add PLANNING_CENTER_APP_ID and PLANNING_CENTER_SECRET' 
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
        error: 'Failed to connect to Planning Center',
        status: testRes.status,
        details: errorText
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const typesData = await testRes.json();
    console.log(`Found ${typesData.data?.length || 0} service types`);

    let totalServices = 0;
    let totalSchedules = 0;

    for (const serviceType of typesData.data || []) {
      console.log(`Processing service type: ${serviceType.attributes.name}`);
      
      // Fetch upcoming plans for each service type
      const plansRes = await fetch(
        `${baseUrl}/service_types/${serviceType.id}/plans?filter=future&per_page=10`,
        { headers: { 'Authorization': `Basic ${credentials}` } }
      );

      if (!plansRes.ok) {
        console.error(`Error fetching plans for ${serviceType.attributes.name}`);
        continue;
      }

      const plansData = await plansRes.json();
      console.log(`Found ${plansData.data?.length || 0} plans for ${serviceType.attributes.name}`);

      for (const plan of plansData.data || []) {
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
          continue;
        }

        totalServices++;
        console.log(`Synced service: ${serviceName} on ${serviceDate}`);

        // Fetch team members for this plan
        const teamRes = await fetch(
          `${baseUrl}/service_types/${serviceType.id}/plans/${plan.id}/team_members?per_page=100`,
          { headers: { 'Authorization': `Basic ${credentials}` } }
        );

        if (!teamRes.ok) {
          console.error(`Error fetching team for plan ${plan.id}`);
          continue;
        }

        const teamData = await teamRes.json();
        console.log(`Found ${teamData.data?.length || 0} team members`);

        for (const member of teamData.data || []) {
          // Only sync confirmed members
          if (member.attributes.status !== 'C') continue;

          const personId = member.relationships?.person?.data?.id || member.id;

          // Check if schedule already exists
          const { data: existing } = await supabaseClient
            .from('schedules')
            .select('id')
            .eq('service_id', service.id)
            .eq('planning_center_person_id', personId)
            .maybeSingle();

          if (!existing) {
            const teamPosition = member.attributes.team_position_name || '';
            const parts = teamPosition.split(' - ');
            
            const { error: insertError } = await supabaseClient.from('schedules').insert({
              service_id: service.id,
              planning_center_person_id: personId,
              volunteer_name: member.attributes.name,
              team_name: parts[0] || null,
              position_name: parts[1] || null,
            });

            if (!insertError) {
              totalSchedules++;
            }
          }
        }
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
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
