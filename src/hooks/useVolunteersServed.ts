import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

export type ServedPeriod = 'month' | '3months' | '6months' | '1year' | 'custom';

export interface ServedServiceItem {
  service_id: string;
  service_name: string;
  scheduled_at: string;
  team_name: string | null;
  checked_in_at: string;
}

export interface VolunteerServedSummary {
  volunteer_name: string;
  volunteer_id: string | null;
  planning_center_person_id: string | null;
  teams: string[];
  total_checkins: number;
  services: ServedServiceItem[];
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

function getRange(period: ServedPeriod, customRange?: DateRange): { start: Date; end: Date } {
  const now = new Date();
  switch (period) {
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case '3months':
      return { start: subMonths(now, 3), end: now };
    case '6months':
      return { start: subMonths(now, 6), end: now };
    case '1year':
      return { start: subMonths(now, 12), end: now };
    case 'custom':
      return customRange
        ? { start: customRange.startDate, end: customRange.endDate }
        : { start: subMonths(now, 1), end: now };
  }
}

async function fetchAllCheckIns(start: string, end: string) {
  const PAGE_SIZE = 1000;
  let all: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('check_ins')
      .select(`
        id,
        checked_in_at,
        volunteer_id,
        schedule:schedules!inner(
          volunteer_name,
          planning_center_person_id,
          volunteer_id,
          team_name
        ),
        service:services!inner(
          id,
          name,
          scheduled_at
        )
      `)
      .gte('checked_in_at', start)
      .lte('checked_in_at', end)
      .order('checked_in_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (data && data.length > 0) {
      all = all.concat(data);
      from += PAGE_SIZE;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }
  return all;
}

export function useVolunteersServed(
  period: ServedPeriod,
  teamName?: string,
  customRange?: DateRange
) {
  return useQuery({
    queryKey: [
      'reports',
      'volunteers-served',
      period,
      teamName,
      customRange?.startDate?.toISOString(),
      customRange?.endDate?.toISOString(),
    ],
    queryFn: async () => {
      const { start, end } = getRange(period, customRange);
      const rows = await fetchAllCheckIns(start.toISOString(), end.toISOString());

      const map = new Map<string, VolunteerServedSummary>();

      rows.forEach((row: any) => {
        const sched = row.schedule;
        const svc = row.service;
        if (!sched || !svc) return;

        // Team filter
        if (teamName) {
          const teamsArr = (sched.team_name || '')
            .split(',')
            .map((t: string) => t.trim().toLowerCase());
          if (!teamsArr.some((t: string) => t.includes(teamName.toLowerCase()))) return;
        }

        const key =
          sched.planning_center_person_id ||
          sched.volunteer_id ||
          row.volunteer_id ||
          sched.volunteer_name;

        if (!map.has(key)) {
          map.set(key, {
            volunteer_name: sched.volunteer_name,
            volunteer_id: sched.volunteer_id || row.volunteer_id || null,
            planning_center_person_id: sched.planning_center_person_id || null,
            teams: [],
            total_checkins: 0,
            services: [],
          });
        }

        const vol = map.get(key)!;
        vol.total_checkins++;
        vol.services.push({
          service_id: svc.id,
          service_name: svc.name,
          scheduled_at: svc.scheduled_at,
          team_name: sched.team_name || null,
          checked_in_at: row.checked_in_at,
        });

        if (sched.team_name) {
          sched.team_name.split(',').forEach((t: string) => {
            const trimmed = t.trim();
            if (trimmed && !vol.teams.includes(trimmed)) vol.teams.push(trimmed);
          });
        }
      });

      const list = Array.from(map.values()).map((v) => ({
        ...v,
        services: v.services.sort(
          (a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
        ),
      }));

      list.sort((a, b) => b.total_checkins - a.total_checkins || a.volunteer_name.localeCompare(b.volunteer_name));

      return {
        total_volunteers: list.length,
        total_checkins: list.reduce((acc, v) => acc + v.total_checkins, 0),
        volunteers: list,
      };
    },
  });
}
