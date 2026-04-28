import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subMonths, subDays } from 'date-fns';

export type InactivityPeriod = '1month' | '2months' | '3months' | '4months' | '6months' | '1year';
export type InactivityCriteria = 'checkin' | 'schedule';

export interface InactiveVolunteer {
  volunteer_name: string;
  planning_center_person_id: string;
  volunteer_id: string | null;
  last_team: string | null;
  last_activity_date: string;
  total_schedules: number;
  total_checkins: number;
  months_inactive: number;
}

function getCutoffDate(period: InactivityPeriod): Date {
  const now = new Date();
  if (period === '1month') return subDays(now, 30);
  const map: Record<Exclude<InactivityPeriod, '1month'>, number> = {
    '2months': 2,
    '3months': 3,
    '4months': 4,
    '6months': 6,
    '1year': 12,
  };
  return subMonths(now, map[period]);
}

async function fetchAllSchedules(teamName?: string) {
  const PAGE_SIZE = 1000;
  let allSchedules: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('schedules')
      .select(`
        volunteer_name,
        planning_center_person_id,
        volunteer_id,
        team_name,
        service:services!inner(scheduled_at),
        check_in:check_ins(id, checked_in_at)
      `)
      .range(from, from + PAGE_SIZE - 1);

    if (teamName) {
      query = query.ilike('team_name', `%${teamName}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (data && data.length > 0) {
      allSchedules = allSchedules.concat(data);
      from += PAGE_SIZE;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  return allSchedules;
}

export function useInactiveVolunteers(period: InactivityPeriod, criteria: InactivityCriteria = 'checkin', teamName?: string) {
  return useQuery({
    queryKey: ['reports', 'inactive', period, criteria, teamName],
    queryFn: async () => {
      const cutoffDate = getCutoffDate(period);

      const schedules = await fetchAllSchedules(teamName);

      // Group by volunteer
      const volunteerMap = new Map<string, {
        volunteer_name: string;
        planning_center_person_id: string;
        volunteer_id: string | null;
        last_team: string | null;
        last_checkin_date: Date | null;
        last_schedule_date: Date | null;
        total_schedules: number;
        total_checkins: number;
        has_schedule_in_window: boolean;
        has_checkin_in_window: boolean;
      }>();

      const now = new Date();

      schedules.forEach((schedule: any) => {
        const key = schedule.planning_center_person_id;
        const serviceDate = new Date(schedule.service.scheduled_at);

        // Ignore future schedules — they don't count as "activity"
        if (serviceDate > now) return;

        const hasCheckin = schedule.check_in && schedule.check_in.length > 0;
        const checkinDate = hasCheckin ? new Date(schedule.check_in[0].checked_in_at) : null;

        if (!volunteerMap.has(key)) {
          volunteerMap.set(key, {
            volunteer_name: schedule.volunteer_name,
            planning_center_person_id: schedule.planning_center_person_id,
            volunteer_id: schedule.volunteer_id,
            last_team: schedule.team_name,
            last_checkin_date: null,
            last_schedule_date: null,
            total_schedules: 0,
            total_checkins: 0,
            has_schedule_in_window: false,
            has_checkin_in_window: false,
          });
        }

        const vol = volunteerMap.get(key)!;
        vol.total_schedules++;

        // Track schedule activity within the window
        if (serviceDate >= cutoffDate) {
          vol.has_schedule_in_window = true;
        }

        if (hasCheckin && checkinDate) {
          vol.total_checkins++;
          if (!vol.last_checkin_date || checkinDate > vol.last_checkin_date) {
            vol.last_checkin_date = checkinDate;
          }
          if (checkinDate >= cutoffDate) {
            vol.has_checkin_in_window = true;
          }
        }

        // Update last_team based on most recent past schedule
        if (!vol.last_schedule_date || serviceDate >= vol.last_schedule_date) {
          vol.last_team = schedule.team_name;
          vol.last_schedule_date = serviceDate;
        }

        if (schedule.volunteer_id && !vol.volunteer_id) {
          vol.volunteer_id = schedule.volunteer_id;
        }
      });

      // Filter: volunteer has past activity but NO activity within the window
      const result: InactiveVolunteer[] = [];

      volunteerMap.forEach((vol) => {
        let isInactive: boolean;
        let referenceDate: Date | null;

        if (criteria === 'checkin') {
          // Inactive = no check-in in window, but has at least one past activity (schedule or checkin)
          isInactive = !vol.has_checkin_in_window;
          referenceDate = vol.last_checkin_date || vol.last_schedule_date;
        } else {
          // Inactive = no schedule in window, but has past schedule history
          isInactive = !vol.has_schedule_in_window;
          referenceDate = vol.last_schedule_date;
        }

        if (!isInactive || !referenceDate) return;

        const diffMs = now.getTime() - referenceDate.getTime();
        const monthsInactive = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44)));

        result.push({
          volunteer_name: vol.volunteer_name,
          planning_center_person_id: vol.planning_center_person_id,
          volunteer_id: vol.volunteer_id,
          last_team: vol.last_team,
          last_activity_date: referenceDate.toISOString(),
          total_schedules: vol.total_schedules,
          total_checkins: vol.total_checkins,
          months_inactive: monthsInactive,
        });
      });

      // Sort by most recently active first (so this month's "missing" volunteers come first)
      result.sort((a, b) =>
        new Date(b.last_activity_date).getTime() - new Date(a.last_activity_date).getTime()
      );
      return result;
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
