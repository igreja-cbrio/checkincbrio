import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VolunteerQrCode {
  planning_center_person_id: string;
  volunteer_name: string;
  avatar_url: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Starting automatic Planning Center sync...');

  try {
    // Verify authorization - accept CRON_SECRET or ANON_KEY for cron calls
    const authHeader = req.headers.get('Authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    const token = authHeader?.replace('Bearer ', '');
    const isValidCronSecret = cronSecret && token === cronSecret;
    const isValidAnonKey = anonKey && token === anonKey;
    
    if (!isValidCronSecret && !isValidAnonKey) {
      console.error('Invalid or missing authorization');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Authorization validated, source:', isValidCronSecret ? 'CRON_SECRET' : 'ANON_KEY');

    // Create service role client for database operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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
    const allVolunteers = new Map<string, VolunteerQrCode>();

    // Process service types
    const processServiceType = async (serviceType: any) => {
      let typeServices = 0;
      let typeSchedules = 0;
      
      console.log(`Processing service type: ${serviceType.attributes.name}`);
      
      // Fetch only next 3 upcoming plans
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

      // Process plans
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

        typeServices++;
        console.log(`Synced service: ${serviceName} on ${serviceDate}`);

        // Fetch team members with person details
        const teamRes = await fetch(
          `${baseUrl}/service_types/${serviceType.id}/plans/${plan.id}/team_members?per_page=100&include=person`,
          { headers: { 'Authorization': `Basic ${credentials}` } }
        );

        if (!teamRes.ok) {
          console.error(`Error fetching team for plan ${plan.id}`);
          continue;
        }

        const teamData = await teamRes.json();
        console.log(`Found ${teamData.data?.length || 0} team members`);

        // Create person map from includes
        const personMap = new Map<string, any>();
        if (teamData.included) {
          for (const item of teamData.included) {
            if (item.type === 'Person') {
              personMap.set(item.id, item);
            }
          }
        }

        // Deduplicate schedules by person within each service
        const scheduleMap = new Map<string, any>();
        
        for (const member of teamData.data || []) {
          const memberStatus = member.attributes.status;
          if (!['C', 'U', 'D', 'S'].includes(memberStatus)) continue;

          const personId = member.relationships?.person?.data?.id || member.id;
          const statusMap: Record<string, string> = { 'C': 'confirmed', 'U': 'pending', 'D': 'declined', 'S': 'scheduled' };
          const confirmationStatus = statusMap[memberStatus] || 'unknown';
          
          const teamPosition = member.attributes.team_position_name || '';
          const parts = teamPosition.split(' - ');

          const personData = personMap.get(personId);
          const avatarUrl = personData?.attributes?.avatar || member.attributes?.photo_thumbnail || null;

          // Use Map to deduplicate by personId
          const key = `${service.id}_${personId}`;
          if (!scheduleMap.has(key)) {
            scheduleMap.set(key, {
              service_id: service.id,
              planning_center_person_id: personId,
              volunteer_name: member.attributes.name,
              team_name: parts[0] || null,
              position_name: parts[1] || null,
              confirmation_status: confirmationStatus,
            });
          }

          // Collect volunteer for QR code
          if (personId && member.attributes.name) {
            allVolunteers.set(personId, {
              planning_center_person_id: personId,
              volunteer_name: member.attributes.name,
              avatar_url: avatarUrl,
            });
          }
        }

        // Upsert deduplicated schedules one by one to avoid conflicts
        const schedulesToUpsert = Array.from(scheduleMap.values());
        for (const schedule of schedulesToUpsert) {
          const { error: upsertError } = await supabaseClient
            .from('schedules')
            .upsert(schedule, { 
              onConflict: 'service_id,planning_center_person_id',
            });
          
          if (!upsertError) {
            typeSchedules++;
          } else {
            console.error('Upsert error:', upsertError);
          }
        }
      }

      return { services: typeServices, schedules: typeSchedules };
    };

    // Process all service types in batches of 5
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

    console.log(`Sync completed: ${totalServices} services, ${totalSchedules} schedules`);

    // Generate QR codes for volunteers
    const volunteerQrCodes = Array.from(allVolunteers.values());
    let avatarsImported = 0;
    
    if (volunteerQrCodes.length > 0) {
      console.log(`Generating QR codes for ${volunteerQrCodes.length} volunteers...`);
      avatarsImported = volunteerQrCodes.filter(v => v.avatar_url).length;
      
      const batchSize = 100;
      for (let i = 0; i < volunteerQrCodes.length; i += batchSize) {
        const batch = volunteerQrCodes.slice(i, i + batchSize);
        
        const { error: qrError } = await supabaseClient
          .from('volunteer_qrcodes')
          .upsert(batch, { 
            onConflict: 'planning_center_person_id',
            ignoreDuplicates: false
          });
        
        if (qrError) {
          console.error('Error upserting volunteer QR codes:', qrError);
        }
      }
      console.log(`QR codes generated for ${volunteerQrCodes.length} volunteers`);
    }

    // Log successful sync
    await supabaseClient
      .from('sync_logs')
      .insert({
        sync_type: 'automatic',
        services_synced: totalServices,
        schedules_synced: totalSchedules,
        qrcodes_generated: volunteerQrCodes.length,
        status: 'success',
      });

    return new Response(JSON.stringify({ 
      success: true, 
      services: totalServices,
      schedules: totalSchedules,
      qrCodesGenerated: volunteerQrCodes.length,
      avatarsImported,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Auto sync error:', message);
    return new Response(JSON.stringify({ error: 'An error occurred during sync' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
