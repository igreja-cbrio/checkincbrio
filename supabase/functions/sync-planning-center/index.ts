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

interface TeamMemberResponse {
  data: any[];
  included: any[];
  links?: { next?: string };
  meta?: { total_count?: number };
}

// Helper function to fetch ALL team members with pagination
async function fetchAllTeamMembers(
  baseUrl: string,
  serviceTypeId: string,
  planId: string,
  credentials: string
): Promise<TeamMemberResponse> {
  const allMembers: any[] = [];
  const allIncluded: any[] = [];
  let offset = 0;
  const perPage = 100;
  let totalCount = 0;
  let pageCount = 0;

  console.log(`[Pagination] Starting to fetch team members for plan ${planId}`);

  while (true) {
    const url = `${baseUrl}/service_types/${serviceTypeId}/plans/${planId}/team_members?per_page=${perPage}&offset=${offset}&include=person`;
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Basic ${credentials}` }
    });

    if (!response.ok) {
      console.error(`[Pagination] Error fetching page at offset ${offset}: ${response.status}`);
      break;
    }

    const data: TeamMemberResponse = await response.json();
    pageCount++;
    
    const membersInPage = data.data?.length || 0;
    console.log(`[Pagination] Page ${pageCount}: fetched ${membersInPage} members (offset: ${offset})`);
    
    if (data.meta?.total_count && totalCount === 0) {
      totalCount = data.meta.total_count;
      console.log(`[Pagination] Total members reported by API: ${totalCount}`);
    }

    if (data.data) {
      allMembers.push(...data.data);
    }
    
    if (data.included) {
      allIncluded.push(...data.included);
    }

    // Check if there are more pages
    if (!data.data || data.data.length < perPage) {
      console.log(`[Pagination] Finished: retrieved ${allMembers.length} total members in ${pageCount} pages`);
      break;
    }

    offset += perPage;
    
    // Safety limit to prevent infinite loops
    if (pageCount >= 50) {
      console.warn(`[Pagination] Safety limit reached at 50 pages (${allMembers.length} members)`);
      break;
    }
  }

  return {
    data: allMembers,
    included: allIncluded,
    meta: { total_count: allMembers.length }
  };
}

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
    let totalMembersFound = 0;
    let totalMembersProcessed = 0;
    const allVolunteers = new Map<string, VolunteerQrCode>();

    // Process service types in parallel with limited concurrency
    const processServiceType = async (serviceType: any) => {
      let typeServices = 0;
      let typeSchedules = 0;
      let typeMembersFound = 0;
      let typeMembersProcessed = 0;
      
      console.log(`\n=== Processing service type: ${serviceType.attributes.name} ===`);
      
      // Fetch next 10 upcoming plans (increased from 3)
      const plansRes = await fetch(
        `${baseUrl}/service_types/${serviceType.id}/plans?filter=future&per_page=10`,
        { headers: { 'Authorization': `Basic ${credentials}` } }
      );

      if (!plansRes.ok) {
        console.error(`Error fetching plans for ${serviceType.attributes.name}`);
        return { services: 0, schedules: 0, membersFound: 0, membersProcessed: 0 };
      }

      const plansData = await plansRes.json();
      console.log(`Found ${plansData.data?.length || 0} future plans for ${serviceType.attributes.name}`);

      // Process plans sequentially to avoid rate limiting
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
        console.log(`\nSyncing service: ${serviceName} on ${serviceDate} (Plan ID: ${plan.id})`);

        // Fetch ALL team members with pagination
        const teamData = await fetchAllTeamMembers(baseUrl, serviceType.id, plan.id, credentials);
        
        typeMembersFound += teamData.data.length;
        console.log(`[Stats] Total team members found for this plan: ${teamData.data.length}`);

        // Create a map of person data from includes
        const personMap = new Map<string, any>();
        if (teamData.included) {
          for (const item of teamData.included) {
            if (item.type === 'Person') {
              personMap.set(item.id, item);
            }
          }
        }

        // Prepare batch data for schedules - process ALL members without status filter
        const scheduleMap = new Map<string, any>();
        const statusCounts: Record<string, number> = {};
        
        for (const member of teamData.data || []) {
          const memberStatus = member.attributes.status || 'unknown';
          
          // Count statuses for logging
          statusCounts[memberStatus] = (statusCounts[memberStatus] || 0) + 1;

          const personId = member.relationships?.person?.data?.id || member.id;
          
          // Map ALL statuses - not just C, U, D, S
          const statusMap: Record<string, string> = { 
            'C': 'confirmed', 
            'U': 'pending', 
            'D': 'declined', 
            'S': 'scheduled',
            'P': 'pending',  // Potentially confirmed
            'N': 'pending',  // Not yet responded
          };
          const confirmationStatus = statusMap[memberStatus] || 'unknown';
          
          const teamPosition = member.attributes.team_position_name || '';
          const parts = teamPosition.split(' - ');

          // Get person data from includes to extract avatar URL
          const personData = personMap.get(personId);
          const avatarUrl = personData?.attributes?.avatar || member.attributes?.photo_thumbnail || null;
          
          // Use Map to deduplicate by personId within the same service
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
            typeMembersProcessed++;
          }

          // Collect volunteer for QR code generation with avatar
          if (personId && member.attributes.name) {
            allVolunteers.set(personId, {
              planning_center_person_id: personId,
              volunteer_name: member.attributes.name,
              avatar_url: avatarUrl,
            });
          }
        }

        // Log status distribution
        console.log(`[Stats] Status distribution: ${JSON.stringify(statusCounts)}`);
        console.log(`[Stats] Unique volunteers for this plan: ${scheduleMap.size}`);

        // Batch upsert all schedules
        const schedulesToUpsert = Array.from(scheduleMap.values());
        if (schedulesToUpsert.length > 0) {
          // Process in smaller batches to avoid conflicts
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
      }

      console.log(`\n=== ${serviceType.attributes.name} Summary ===`);
      console.log(`Services: ${typeServices}, Schedules: ${typeSchedules}`);
      console.log(`Members found: ${typeMembersFound}, Processed: ${typeMembersProcessed}`);

      return { 
        services: typeServices, 
        schedules: typeSchedules,
        membersFound: typeMembersFound,
        membersProcessed: typeMembersProcessed
      };
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
        totalMembersFound += result.membersFound;
        totalMembersProcessed += result.membersProcessed;
      }
    }

    console.log(`\n========================================`);
    console.log(`SYNC COMPLETED`);
    console.log(`Total services: ${totalServices}`);
    console.log(`Total schedules: ${totalSchedules}`);
    console.log(`Total members found: ${totalMembersFound}`);
    console.log(`Total members processed: ${totalMembersProcessed}`);
    console.log(`Unique volunteers: ${allVolunteers.size}`);
    console.log(`========================================\n`);

    // Generate QR codes for all collected volunteers (with avatar_url)
    const volunteerQrCodes = Array.from(allVolunteers.values());
    let avatarsImported = 0;
    
    if (volunteerQrCodes.length > 0) {
      console.log(`Generating QR codes for ${volunteerQrCodes.length} volunteers...`);
      
      // Count volunteers with avatars
      avatarsImported = volunteerQrCodes.filter(v => v.avatar_url).length;
      console.log(`Found ${avatarsImported} volunteers with avatar photos`);
      
      // Process in batches of 100
      const batchSize = 100;
      for (let i = 0; i < volunteerQrCodes.length; i += batchSize) {
        const batch = volunteerQrCodes.slice(i, i + batchSize);
        
        // For upsert, we need to update avatar_url if it exists
        const { error: qrError } = await supabaseClient
          .from('volunteer_qrcodes')
          .upsert(batch, { 
            onConflict: 'planning_center_person_id',
            ignoreDuplicates: false  // Changed to false to update avatar_url
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
        sync_type: 'manual',
        services_synced: totalServices,
        schedules_synced: totalSchedules,
        qrcodes_generated: volunteerQrCodes.length,
        status: 'success',
        triggered_by: userId,
      });

    return new Response(JSON.stringify({ 
      success: true, 
      services: totalServices,
      newSchedules: totalSchedules,
      qrCodesGenerated: volunteerQrCodes.length,
      avatarsImported,
      totalMembersFound,
      totalMembersProcessed
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
