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
      console.warn(`[Retry] Rate limited, waiting ${wait}ms (attempt ${attempt}/${maxRetries})`);
      await new Promise(r => setTimeout(r, wait));
    } else if (response.status >= 500) {
      const wait = attempt * 1000;
      console.warn(`[Retry] Server error (${response.status}), waiting ${wait}ms`);
      await new Promise(r => setTimeout(r, wait));
    } else {
      break;
    }
  }
  return lastResponse!;
}

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
  let pageCount = 0;

  while (true) {
    const url = `${baseUrl}/service_types/${serviceTypeId}/plans/${planId}/team_members?per_page=${perPage}&offset=${offset}&include=person`;
    const response = await fetchWithRetry(url, { 'Authorization': `Basic ${credentials}` });
    if (!response.ok) break;

    const data: TeamMemberResponse = await response.json();
    pageCount++;
    if (data.data) allMembers.push(...data.data);
    if (data.included) allIncluded.push(...data.included);
    if (!data.data || data.data.length < perPage || pageCount >= 50) break;
    offset += perPage;
  }

  return { data: allMembers, included: allIncluded, meta: { total_count: allMembers.length } };
}

// Fetch plans in a date range with full pagination
async function fetchPlansInRange(
  baseUrl: string,
  serviceTypeId: string,
  credentials: string,
  startDate: string,
  endDate: string
): Promise<any[]> {
  const headers = { 'Authorization': `Basic ${credentials}` };
  const allPlans: any[] = [];
  let offset = 0;
  const perPage = 25;
  let pageCount = 0;

  while (true) {
    const url = `${baseUrl}/service_types/${serviceTypeId}/plans?filter=after,before&after=${startDate}&before=${endDate}&per_page=${perPage}&offset=${offset}&order=sort_date`;
    const response = await fetchWithRetry(url, headers);
    if (!response.ok) {
      console.error(`[Historical] Error fetching plans at offset ${offset}: ${response.status}`);
      break;
    }

    const data = await response.json();
    pageCount++;
    const plans = data.data || [];
    allPlans.push(...plans);
    console.log(`[Historical] Page ${pageCount}: ${plans.length} plans (offset ${offset})`);

    if (plans.length < perPage || pageCount >= 100) break;
    offset += perPage;
  }

  console.log(`[Historical] Total plans for service type ${serviceTypeId}: ${allPlans.length}`);
  return allPlans;
}

// Planning Center returns sort_date as UTC, but it represents the LOCAL service time.
// Convert by adding 3 hours (BRT offset, UTC-3 fixed since 2019).
function normalizeServiceDate(sortDate: string): string {
  if (!sortDate) return sortDate;
  const d = new Date(sortDate);
  if (isNaN(d.getTime())) return sortDate;
  return new Date(d.getTime() + 3 * 60 * 60 * 1000).toISOString();
}

function getVolunteerName(member: any, personData: any): string {
  if (member.attributes.name) return member.attributes.name;
  if (personData?.attributes) {
    const full = `${personData.attributes.first_name || ''} ${personData.attributes.last_name || ''}`.trim();
    if (full) return full;
  }
  return 'Sem nome';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[Historical Sync] Starting...');

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate body
    const body = await req.json();
    const { startDate, endDate } = body;

    if (!startDate || !endDate) {
      return new Response(
        JSON.stringify({ error: 'startDate and endDate are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Historical Sync] Period: ${startDate} to ${endDate}`);

    const userSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await userSupabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .in('role', ['leader', 'admin']);

    if (!roles || roles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const appId = Deno.env.get('PLANNING_CENTER_APP_ID');
    const secret = Deno.env.get('PLANNING_CENTER_SECRET');

    if (!appId || !secret) {
      return new Response(
        JSON.stringify({ error: 'Planning Center credentials not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const credentials = btoa(`${appId}:${secret}`);
    const baseUrl = 'https://api.planningcenteronline.com/services/v2';

    const typesRes = await fetchWithRetry(`${baseUrl}/service_types`, { 'Authorization': `Basic ${credentials}` });
    if (!typesRes.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to connect to Planning Center' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const typesData = await typesRes.json();
    const serviceTypes = typesData.data || [];
    console.log(`[Historical] Found ${serviceTypes.length} service types`);

    let totalServices = 0;
    let totalSchedules = 0;
    const allVolunteers = new Map<string, VolunteerQrCode>();

    for (const serviceType of serviceTypes) {
      console.log(`\n=== [Historical] Processing: ${serviceType.attributes.name} ===`);

      const plans = await fetchPlansInRange(baseUrl, serviceType.id, credentials, startDate, endDate);

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
          console.error('[Historical] Error upserting service:', serviceError);
          continue;
        }

        totalServices++;

        const teamData = await fetchAllTeamMembers(baseUrl, serviceType.id, plan.id, credentials);

        const personMap = new Map<string, any>();
        if (teamData.included) {
          for (const item of teamData.included) {
            if (item.type === 'Person') personMap.set(item.id, item);
          }
        }

        const scheduleMap = new Map<string, any>();
        const teamNamesMap = new Map<string, Set<string>>();

        for (const member of teamData.data || []) {
          const memberStatus = member.attributes.status || 'unknown';
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
            scheduleMap.set(key, {
              service_id: service.id,
              planning_center_person_id: personId,
              volunteer_name: volunteerName,
              team_name: teamName,
              position_name: parts[1] || null,
              confirmation_status: confirmationStatus,
            });
            teamNamesMap.set(key, new Set(teamName ? [teamName] : []));
          } else {
            const existing = scheduleMap.get(key);
            const existingPriority = STATUS_PRIORITY[existing.confirmation_status] ?? 1;
            const newPriority = STATUS_PRIORITY[confirmationStatus] ?? 1;
            if (newPriority > existingPriority) {
              existing.confirmation_status = confirmationStatus;
            }
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

        const schedulesToUpsert = Array.from(scheduleMap.values());
        let planSchedules = 0;
        for (const schedule of schedulesToUpsert) {
          const { error: upsertError } = await supabaseClient
            .from('schedules')
            .upsert(schedule, { onConflict: 'service_id,planning_center_person_id' });
          if (!upsertError) planSchedules++;
          else console.error('[Historical] Upsert error:', upsertError);
        }
        totalSchedules += planSchedules;
        console.log(`[Historical] Plan ${plan.id}: ${serviceName} - ${planSchedules} schedules`);
      }
    }

    // Upsert volunteer QR codes
    const volunteerQrCodes = Array.from(allVolunteers.values());
    if (volunteerQrCodes.length > 0) {
      const qrBatchSize = 100;
      for (let i = 0; i < volunteerQrCodes.length; i += qrBatchSize) {
        const batch = volunteerQrCodes.slice(i, i + qrBatchSize);
        await supabaseClient
          .from('volunteer_qrcodes')
          .upsert(batch, { onConflict: 'planning_center_person_id', ignoreDuplicates: false });
      }
    }

    // Log
    await supabaseClient.from('sync_logs').insert({
      sync_type: 'historical',
      services_synced: totalServices,
      schedules_synced: totalSchedules,
      qrcodes_generated: volunteerQrCodes.length,
      status: 'success',
      triggered_by: userId,
    });

    console.log(`[Historical Sync] DONE: ${totalServices} services, ${totalSchedules} schedules, ${volunteerQrCodes.length} QR codes`);

    return new Response(JSON.stringify({
      success: true,
      services: totalServices,
      schedules: totalSchedules,
      qrCodesGenerated: volunteerQrCodes.length,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Historical Sync] Error:', message);
    return new Response(JSON.stringify({ error: 'An error occurred during historical sync' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
