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

// Status priority: higher = takes precedence
const STATUS_PRIORITY: Record<string, number> = {
  'confirmed': 4,
  'scheduled': 3,
  'pending': 2,
  'unknown': 1,
  'declined': 0,
};

const STATUS_MAP: Record<string, string> = {
  'C': 'confirmed',
  'U': 'pending',
  'D': 'declined',
  'S': 'scheduled',
  'P': 'pending',
  'N': 'pending',
};

// Retry with exponential backoff
async function fetchWithRetry(
  url: string,
  headers: Record<string, string>,
  maxRetries = 3
): Promise<Response> {
  let lastResponse: Response | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, { headers });
    lastResponse = response;

    if (response.ok) return response;

    if (response.status === 429) {
      const wait = Math.pow(2, attempt) * 1000;
      console.warn(`[Retry] Rate limited (429), waiting ${wait}ms (attempt ${attempt}/${maxRetries})`);
      await new Promise(r => setTimeout(r, wait));
    } else if (response.status >= 500) {
      const wait = attempt * 1000;
      console.warn(`[Retry] Server error (${response.status}), waiting ${wait}ms (attempt ${attempt}/${maxRetries})`);
      await new Promise(r => setTimeout(r, wait));
    } else {
      // Client error (4xx), don't retry
      console.error(`[Retry] Client error (${response.status}), not retrying`);
      break;
    }
  }

  return lastResponse!;
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

    const response = await fetchWithRetry(url, { 'Authorization': `Basic ${credentials}` });

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

    if (data.data) allMembers.push(...data.data);
    if (data.included) allIncluded.push(...data.included);

    if (!data.data || data.data.length < perPage) {
      console.log(`[Pagination] Finished: retrieved ${allMembers.length} total members in ${pageCount} pages`);
      break;
    }

    offset += perPage;

    if (pageCount >= 50) {
      console.warn(`[Pagination] Safety limit reached at 50 pages (${allMembers.length} members)`);
      break;
    }
  }

  return { data: allMembers, included: allIncluded, meta: { total_count: allMembers.length } };
}

// Fetch future + recent past plans, deduplicated
async function fetchAllPlans(
  baseUrl: string,
  serviceTypeId: string,
  credentials: string
): Promise<any[]> {
  const headers = { 'Authorization': `Basic ${credentials}` };
  const planMap = new Map<string, any>();

  // Fetch future plans
  const futureRes = await fetchWithRetry(
    `${baseUrl}/service_types/${serviceTypeId}/plans?filter=future&per_page=10`,
    headers
  );
  if (futureRes.ok) {
    const data = await futureRes.json();
    for (const plan of data.data || []) planMap.set(plan.id, plan);
    console.log(`[Plans] Future plans: ${data.data?.length || 0}`);
  }

  // Fetch recent past plans (last 7 days)
  const pastRes = await fetchWithRetry(
    `${baseUrl}/service_types/${serviceTypeId}/plans?filter=past&per_page=5&order=-sort_date`,
    headers
  );
  if (pastRes.ok) {
    const data = await pastRes.json();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    for (const plan of data.data || []) {
      const planDate = new Date(plan.attributes.sort_date);
      if (planDate >= sevenDaysAgo) {
        planMap.set(plan.id, plan);
      }
    }
    console.log(`[Plans] Past plans (last 7 days): ${data.data?.length || 0} fetched, ${planMap.size} total after dedup`);
  }

  return Array.from(planMap.values());
}

// Planning Center returns sort_date as UTC, but it represents the LOCAL service time.
// Convert by adding 3 hours (BRT offset, UTC-3 fixed since 2019).
function normalizeServiceDate(sortDate: string): string {
  if (!sortDate) return sortDate;
  const d = new Date(sortDate);
  if (isNaN(d.getTime())) return sortDate;
  return new Date(d.getTime() + 3 * 60 * 60 * 1000).toISOString();
}

// Get volunteer name with fallbacks
function getVolunteerName(member: any, personData: any): string {
  if (member.attributes.name) return member.attributes.name;
  if (personData?.attributes) {
    const first = personData.attributes.first_name || '';
    const last = personData.attributes.last_name || '';
    const full = `${first} ${last}`.trim();
    if (full) return full;
  }
  return 'Sem nome';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Starting automatic Planning Center sync...');

  try {
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

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const appId = Deno.env.get('PLANNING_CENTER_APP_ID');
    const secret = Deno.env.get('PLANNING_CENTER_SECRET');

    if (!appId || !secret) {
      console.error('Missing Planning Center credentials');
      return new Response(JSON.stringify({ error: 'Planning Center credentials not configured' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const credentials = btoa(`${appId}:${secret}`);
    const baseUrl = 'https://api.planningcenteronline.com/services/v2';

    const testRes = await fetchWithRetry(`${baseUrl}/service_types`, { 'Authorization': `Basic ${credentials}` });

    if (!testRes.ok) {
      console.error('Planning Center API error:', testRes.status);
      return new Response(JSON.stringify({ error: 'Failed to connect to Planning Center' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const typesData = await testRes.json();
    console.log(`Found ${typesData.data?.length || 0} service types`);

    let totalServices = 0;
    let totalSchedules = 0;
    let totalMembersFound = 0;
    let totalMembersProcessed = 0;
    const allVolunteers = new Map<string, VolunteerQrCode>();

    const processServiceType = async (serviceType: any) => {
      let typeServices = 0;
      let typeSchedules = 0;
      let typeMembersFound = 0;
      let typeMembersProcessed = 0;

      console.log(`\n=== Processing service type: ${serviceType.attributes.name} ===`);

      // Fetch future + past plans
      const plans = await fetchAllPlans(baseUrl, serviceType.id, credentials);
      console.log(`Total plans to process for ${serviceType.attributes.name}: ${plans.length}`);

      for (const plan of plans) {
        const serviceDate = normalizeServiceDate(plan.attributes.sort_date);
        const serviceName = plan.attributes.title || serviceType.attributes.name;

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

        const teamData = await fetchAllTeamMembers(baseUrl, serviceType.id, plan.id, credentials);
        typeMembersFound += teamData.data.length;

        const personMap = new Map<string, any>();
        if (teamData.included) {
          for (const item of teamData.included) {
            if (item.type === 'Person') personMap.set(item.id, item);
          }
        }

        // Smart deduplication with status priority
        const scheduleMap = new Map<string, any>();
        const teamNamesMap = new Map<string, Set<string>>();
        const statusCounts: Record<string, number> = {};
        const syncedNames: string[] = [];

        for (const member of teamData.data || []) {
          const memberStatus = member.attributes.status || 'unknown';
          statusCounts[memberStatus] = (statusCounts[memberStatus] || 0) + 1;

          const personId = member.relationships?.person?.data?.id || member.id;
          const confirmationStatus = STATUS_MAP[memberStatus] || 'unknown';

          const teamPosition = member.attributes.team_position_name || '';
          const parts = teamPosition.split(' - ');
          const teamName = parts[0] || null;

          const personData = personMap.get(personId);
          const avatarUrl = personData?.attributes?.avatar || member.attributes?.photo_thumbnail || null;
          const volunteerName = getVolunteerName(member, personData);

          const key = `${service.id}_${personId}`;

          if (!scheduleMap.has(key)) {
            // First occurrence
            scheduleMap.set(key, {
              service_id: service.id,
              planning_center_person_id: personId,
              volunteer_name: volunteerName,
              team_name: teamName,
              position_name: parts[1] || null,
              confirmation_status: confirmationStatus,
            });
            teamNamesMap.set(key, new Set(teamName ? [teamName] : []));
            typeMembersProcessed++;
            syncedNames.push(`${volunteerName} (${confirmationStatus})`);
          } else {
            // Duplicate: update status if higher priority, merge team names
            const existing = scheduleMap.get(key);
            const existingPriority = STATUS_PRIORITY[existing.confirmation_status] ?? 1;
            const newPriority = STATUS_PRIORITY[confirmationStatus] ?? 1;

            if (newPriority > existingPriority) {
              existing.confirmation_status = confirmationStatus;
              console.log(`[Dedup] ${volunteerName}: upgraded status from ${existing.confirmation_status} to ${confirmationStatus}`);
            }

            // Merge team names
            const teams = teamNamesMap.get(key)!;
            if (teamName && !teams.has(teamName)) {
              teams.add(teamName);
              existing.team_name = Array.from(teams).join(', ');
            }
          }

          if (personId && volunteerName !== 'Sem nome') {
            allVolunteers.set(personId, {
              planning_center_person_id: personId,
              volunteer_name: volunteerName,
              avatar_url: avatarUrl,
            });
          }
        }

        console.log(`[Stats] Status distribution: ${JSON.stringify(statusCounts)}`);
        console.log(`[Stats] Unique volunteers for this plan: ${scheduleMap.size}`);
        console.log(`[Names] Synced: ${syncedNames.join(', ')}`);

        const schedulesToUpsert = Array.from(scheduleMap.values());
        for (const schedule of schedulesToUpsert) {
          const { error: upsertError } = await supabaseClient
            .from('schedules')
            .upsert(schedule, { onConflict: 'service_id,planning_center_person_id' });

          if (!upsertError) {
            typeSchedules++;
          } else {
            console.error('Upsert error:', upsertError);
          }
        }
      }

      console.log(`\n=== ${serviceType.attributes.name} Summary ===`);
      console.log(`Services: ${typeServices}, Schedules: ${typeSchedules}`);
      console.log(`Members found: ${typeMembersFound}, Processed: ${typeMembersProcessed}`);

      return { services: typeServices, schedules: typeSchedules, membersFound: typeMembersFound, membersProcessed: typeMembersProcessed };
    };

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
    console.log(`AUTO SYNC COMPLETED`);
    console.log(`Total services: ${totalServices}`);
    console.log(`Total schedules: ${totalSchedules}`);
    console.log(`Total members found: ${totalMembersFound}`);
    console.log(`Total members processed: ${totalMembersProcessed}`);
    console.log(`Unique volunteers: ${allVolunteers.size}`);
    console.log(`========================================\n`);

    const volunteerQrCodes = Array.from(allVolunteers.values());
    let avatarsImported = 0;

    if (volunteerQrCodes.length > 0) {
      console.log(`Generating QR codes for ${volunteerQrCodes.length} volunteers...`);
      avatarsImported = volunteerQrCodes.filter(v => v.avatar_url).length;

      const qrBatchSize = 100;
      for (let i = 0; i < volunteerQrCodes.length; i += qrBatchSize) {
        const batch = volunteerQrCodes.slice(i, i + qrBatchSize);
        const { error: qrError } = await supabaseClient
          .from('volunteer_qrcodes')
          .upsert(batch, { onConflict: 'planning_center_person_id', ignoreDuplicates: false });

        if (qrError) console.error('Error upserting volunteer QR codes:', qrError);
      }
      console.log(`QR codes generated for ${volunteerQrCodes.length} volunteers`);
    }

    await supabaseClient.from('sync_logs').insert({
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
      totalMembersFound,
      totalMembersProcessed,
      timestamp: new Date().toISOString()
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Auto sync error:', message);
    return new Response(JSON.stringify({ error: 'An error occurred during sync' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
