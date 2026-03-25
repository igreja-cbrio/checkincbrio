import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subMonths } from 'date-fns';

export type InactivityPeriod = '2months' | '3months' | '4months' | '6months' | '1year';

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

function getMonthsFromPeriod(period: InactivityPeriod): number {
  const map: Record<InactivityPeriod, number> = {
    '2months': 2,
    '3months': 3,
    '4months': 4,
    '6months': 6,
    '1year': 12,
  };
  return map[period];
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
      query = query.eq('team_name', teamName);
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

export function useInactiveVolunteers(period: InactivityPeriod, teamName?: string) {
  return useQuery({
    queryKey: ['reports', 'inactive', period, teamName],
    queryFn: async () => {
      const months = getMonthsFromPeriod(period);
      const cutoffDate = subMonths(new Date(), months);

      const schedules = await fetchAllSchedules(teamName);

      // Group by volunteer
      const volunteerMap = new Map<string, {
        volunteer_name: string;
        planning_center_person_id: string;
        volunteer_id: string | null;
        last_team: string | null;
        last_activity_date: Date;
        last_schedule_date: Date;
        total_schedules: number;
        total_checkins: number;
      }>();

      schedules.forEach((schedule: any) => {
        const key = schedule.planning_center_person_id;
        const serviceDate = new Date(schedule.service.scheduled_at);
        const hasCheckin = schedule.check_in && schedule.check_in.length > 0;
        const checkinDate = hasCheckin ? new Date(schedule.check_in[0].checked_in_at) : null;

        if (!volunteerMap.has(key)) {
          volunteerMap.set(key, {
            volunteer_name: schedule.volunteer_name,
            planning_center_person_id: schedule.planning_center_person_id,
            volunteer_id: schedule.volunteer_id,
            last_team: schedule.team_name,
            last_activity_date: checkinDate || serviceDate,
            last_schedule_date: serviceDate,
            total_schedules: 0,
            total_checkins: 0,
          });
        }

        const vol = volunteerMap.get(key)!;
        vol.total_schedules++;

        if (hasCheckin) {
          vol.total_checkins++;
          if (checkinDate && checkinDate > vol.last_activity_date) {
            vol.last_activity_date = checkinDate;
            vol.last_team = schedule.team_name;
          }
        }

        if (serviceDate > vol.last_schedule_date) {
          vol.last_schedule_date = serviceDate;
          if (serviceDate > vol.last_activity_date) {
            vol.last_activity_date = serviceDate;
            vol.last_team = schedule.team_name;
          }
        }

        if (schedule.volunteer_id && !vol.volunteer_id) {
          vol.volunteer_id = schedule.volunteer_id;
        }
      });

      // Filter by cutoff and calculate months inactive
      const now = new Date();
      const result: InactiveVolunteer[] = [];

      volunteerMap.forEach((vol) => {
        if (vol.last_activity_date < cutoffDate) {
          const diffMs = now.getTime() - vol.last_activity_date.getTime();
          const monthsInactive = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));

          result.push({
            volunteer_name: vol.volunteer_name,
            planning_center_person_id: vol.planning_center_person_id,
            volunteer_id: vol.volunteer_id,
            last_team: vol.last_team,
            last_activity_date: vol.last_activity_date.toISOString(),
            total_schedules: vol.total_schedules,
            total_checkins: vol.total_checkins,
            months_inactive: monthsInactive,
          });
        }
      });

      result.sort((a, b) => b.months_inactive - a.months_inactive);
      return result;
    },
  });
}
