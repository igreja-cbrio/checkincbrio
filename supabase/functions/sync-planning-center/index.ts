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

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const appId = Deno.env.get('PLANNING_CENTER_APP_ID');
    const secret = Deno.env.get('PLANNING_CENTER_SECRET');

    if (!appId || !secret) {
      throw new Error('Planning Center credentials not configured');
    }

    const credentials = btoa(`${appId}:${secret}`);
    const baseUrl = 'https://api.planningcenteronline.com/services/v2';

    // Fetch service types
    const typesRes = await fetch(`${baseUrl}/service_types`, {
      headers: { 'Authorization': `Basic ${credentials}` }
    });
    const typesData = await typesRes.json();

    let totalSynced = 0;

    for (const serviceType of typesData.data || []) {
      // Fetch upcoming plans for each service type
      const plansRes = await fetch(
        `${baseUrl}/service_types/${serviceType.id}/plans?filter=future&per_page=10`,
        { headers: { 'Authorization': `Basic ${credentials}` } }
      );
      const plansData = await plansRes.json();

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

        // Fetch team members for this plan
        const teamRes = await fetch(
          `${baseUrl}/service_types/${serviceType.id}/plans/${plan.id}/team_members?per_page=100`,
          { headers: { 'Authorization': `Basic ${credentials}` } }
        );
        const teamData = await teamRes.json();

        for (const member of teamData.data || []) {
          if (member.attributes.status !== 'C') continue; // Only confirmed

          // Check if schedule exists
          const { data: existing } = await supabaseClient
            .from('schedules')
            .select('id')
            .eq('service_id', service.id)
            .eq('planning_center_person_id', member.relationships?.person?.data?.id || member.id)
            .single();

          if (!existing) {
            await supabaseClient.from('schedules').insert({
              service_id: service.id,
              planning_center_person_id: member.relationships?.person?.data?.id || member.id,
              volunteer_name: member.attributes.name,
              team_name: member.attributes.team_position_name?.split(' - ')[0] || null,
              position_name: member.attributes.team_position_name?.split(' - ')[1] || null,
            });
            totalSynced++;
          }
        }
      }
    }

    console.log(`Sync completed: ${totalSynced} new schedules`);

    return new Response(JSON.stringify({ success: true, synced: totalSynced }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Sync error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
