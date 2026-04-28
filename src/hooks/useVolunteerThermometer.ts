import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subMonths, subWeeks, startOfMonth, differenceInDays } from 'date-fns';

export type ThermometerPeriod = 'month' | '3months' | '6months' | 'custom';

export type ActivityLevel = 'very_active' | 'regular' | 'low' | 'inactive';

export interface VolunteerThermometerData {
  volunteer_name: string;
  planning_center_person_id: string;
  volunteer_id: string | null;
  team_name: string | null;
  total_schedules: number;
  total_checkins: number;
  attendance_rate: number;
  last_activity_date: string | null;
  level: ActivityLevel;
}

export interface ThermometerSummary {
  very_active: number;
  regular: number;
  low: number;
  inactive: number;
  total: number;
  maxSchedules: number;
  volunteers: VolunteerThermometerData[];
}

interface DateRange {
  startDate: Date;
  endDate: Date;
}

function getPeriodDates(period: ThermometerPeriod, customRange?: DateRange): { start: Date; end: Date } {
  const now = new Date();
  switch (period) {
    case 'month':
      return { start: startOfMonth(now), end: now };
    case '3months':
      return { start: subMonths(now, 3), end: now };
    case '6months':
      return { start: subMonths(now, 6), end: now };
    case 'custom':
      return customRange
        ? { start: customRange.startDate, end: customRange.endDate }
        : { start: subMonths(now, 1), end: now };
    default:
      return { start: subMonths(now, 1), end: now };
  }
}

async function fetchAllSchedulesInPeriod(startDate: string, endDate: string, teamName?: string) {
  const PAGE_SIZE = 1000;
  let all: any[] = [];
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
      .gte('services.scheduled_at', startDate)
      .lte('services.scheduled_at', endDate)
      .range(from, from + PAGE_SIZE - 1);

    if (teamName) {
      query = query.ilike('team_name', `%${teamName}%`);
    }

    const { data, error } = await query;
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

function classifyVolunteers(
  volunteerMap: Map<string, Omit<VolunteerThermometerData, 'level'>>,
  periodDays: number
): ThermometerSummary {
  const volunteers = Array.from(volunteerMap.values());

  if (volunteers.length === 0) {
    return { very_active: 0, regular: 0, low: 0, inactive: 0, total: 0, maxSchedules: 0, volunteers: [] };
  }

  // Thresholds based on check-ins per period (scaled by period length)
  const factor = Math.max(1, periodDays / 30);
  const lowThreshold = Math.ceil(1 * factor);      // até este nº de check-ins => Pouco Ativo
  const regularThreshold = Math.ceil(4 * factor);  // até este nº => Regular; acima => Muito Ativo

  let maxSchedules = 0;

  const classified: VolunteerThermometerData[] = volunteers.map(vol => {
    if (vol.total_schedules > maxSchedules) maxSchedules = vol.total_schedules;

    let level: ActivityLevel;

    // Inativo = nenhum check-in no período (mesmo se foi escalado)
    if (vol.total_checkins === 0) {
      level = 'inactive';
    } else if (vol.total_checkins <= lowThreshold) {
      level = 'low';
    } else if (vol.total_checkins <= regularThreshold) {
      level = 'regular';
    } else {
      level = 'very_active';
    }

    return { ...vol, level };
  });

  const levelOrder: Record<ActivityLevel, number> = { very_active: 0, regular: 1, low: 2, inactive: 3 };
  classified.sort((a, b) => {
    if (a.level !== b.level) return levelOrder[a.level] - levelOrder[b.level];
    return b.total_checkins - a.total_checkins;
  });

  return {
    very_active: classified.filter(v => v.level === 'very_active').length,
    regular: classified.filter(v => v.level === 'regular').length,
    low: classified.filter(v => v.level === 'low').length,
    inactive: classified.filter(v => v.level === 'inactive').length,
    total: classified.length,
    maxSchedules,
    volunteers: classified,
  };
}

export function useVolunteerThermometer(
  period: ThermometerPeriod,
  teamName?: string,
  customRange?: DateRange
) {
  return useQuery({
    queryKey: ['reports', 'thermometer', period, teamName, customRange?.startDate?.toISOString(), customRange?.endDate?.toISOString()],
    queryFn: async () => {
      const { start, end } = getPeriodDates(period, customRange);
      const periodDays = differenceInDays(end, start) || 1;

      const schedules = await fetchAllSchedulesInPeriod(
        start.toISOString(),
        end.toISOString(),
        teamName
      );

      const volunteerMap = new Map<string, Omit<VolunteerThermometerData, 'level'>>();

      schedules.forEach((schedule: any) => {
        const key = schedule.planning_center_person_id;
        const hasCheckin = schedule.check_in && schedule.check_in.length > 0;
        const serviceDate = schedule.service?.scheduled_at;
        const checkinDate = hasCheckin ? schedule.check_in[0].checked_in_at : null;
        const activityDate = checkinDate || serviceDate;

        if (!volunteerMap.has(key)) {
          volunteerMap.set(key, {
            volunteer_name: schedule.volunteer_name,
            planning_center_person_id: schedule.planning_center_person_id,
            volunteer_id: schedule.volunteer_id,
            team_name: schedule.team_name,
            total_schedules: 0,
            total_checkins: 0,
            attendance_rate: 0,
            last_activity_date: activityDate,
          });
        }

        const vol = volunteerMap.get(key)!;
        vol.total_schedules++;
        if (hasCheckin) vol.total_checkins++;

        if (activityDate && (!vol.last_activity_date || new Date(activityDate) > new Date(vol.last_activity_date))) {
          vol.last_activity_date = activityDate;
        }

        if (schedule.team_name && schedule.service?.scheduled_at) {
          vol.team_name = schedule.team_name;
        }

        if (schedule.volunteer_id && !vol.volunteer_id) {
          vol.volunteer_id = schedule.volunteer_id;
        }
      });

      volunteerMap.forEach(vol => {
        vol.attendance_rate = vol.total_schedules > 0
          ? Math.round((vol.total_checkins / vol.total_schedules) * 100)
          : 0;
      });

      return classifyVolunteers(volunteerMap, periodDays);
    },
  });
}
