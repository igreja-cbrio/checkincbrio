import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export interface ServiceDetail {
  serviceId: string;
  serviceName: string;
  scheduledAt: string;
  positions: number;
  checkins: number;
  rate: number;
}

export interface VolunteerServed {
  name: string;
  teamName: string | null;
  timesServed: number;
  timesCheckedIn: number;
}

export interface WeeklyReportSummary {
  totalPositions: number;
  totalCheckins: number;
  attendanceRate: number;
  uniqueVolunteers: number;
  serviceBreakdown: ServiceDetail[];
  volunteerList: VolunteerServed[];
}

function getWeeklyDateRange(period: 'last_week' | 'month' | '3months') {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  switch (period) {
    case 'last_week':
      // Last completed week (Sunday to Saturday)
      const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 0 });
      startDate = startOfWeek(subWeeks(now, 1), { weekStartsOn: 0 });
      endDate = lastWeekEnd;
      break;
    case 'month':
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      break;
    case '3months':
      startDate = subMonths(startOfMonth(now), 2);
      endDate = endOfMonth(now);
      break;
  }

  return { startDate, endDate };
}

export function useWeeklyReport(period: 'last_week' | 'month' | '3months', teamName?: string) {
  return useQuery({
    queryKey: ['weekly-report', period, teamName],
    queryFn: async (): Promise<WeeklyReportSummary> => {
      const { startDate, endDate } = getWeeklyDateRange(period);

      // Fetch services with their schedules and check-ins
      const { data: services, error } = await supabase
        .from('services')
        .select(`
          id,
          name,
          scheduled_at,
          schedules(
            id,
            volunteer_name,
            team_name,
            check_in:check_ins(id)
          )
        `)
        .gte('scheduled_at', startDate.toISOString())
        .lte('scheduled_at', endDate.toISOString())
        .order('scheduled_at', { ascending: true });

      if (error) throw error;

      let totalPositions = 0;
      let totalCheckins = 0;
      const volunteerMap = new Map<string, { teamName: string | null; served: number; checkedIn: number }>();
      const serviceBreakdown: ServiceDetail[] = [];

      services?.forEach((service: any) => {
        // Filter by team if specified
        const schedules = teamName
          ? service.schedules?.filter((s: any) => s.team_name === teamName) || []
          : service.schedules || [];

        const positions = schedules.length;
        const checkins = schedules.filter((s: any) => s.check_in && s.check_in.length > 0).length;

        if (positions > 0) {
          totalPositions += positions;
          totalCheckins += checkins;

          serviceBreakdown.push({
            serviceId: service.id,
            serviceName: service.name,
            scheduledAt: service.scheduled_at,
            positions,
            checkins,
            rate: positions > 0 ? (checkins / positions) * 100 : 0,
          });

          // Track unique volunteers
          schedules.forEach((schedule: any) => {
            const name = schedule.volunteer_name;
            const hasCheckedIn = schedule.check_in && schedule.check_in.length > 0;

            if (!volunteerMap.has(name)) {
              volunteerMap.set(name, { teamName: schedule.team_name, served: 0, checkedIn: 0 });
            }

            const stats = volunteerMap.get(name)!;
            stats.served++;
            if (hasCheckedIn) {
              stats.checkedIn++;
            }
          });
        }
      });

      const volunteerList: VolunteerServed[] = Array.from(volunteerMap.entries())
        .map(([name, stats]) => ({
          name,
          teamName: stats.teamName,
          timesServed: stats.served,
          timesCheckedIn: stats.checkedIn,
        }))
        .sort((a, b) => b.timesServed - a.timesServed);

      return {
        totalPositions,
        totalCheckins,
        attendanceRate: totalPositions > 0 ? (totalCheckins / totalPositions) * 100 : 0,
        uniqueVolunteers: volunteerList.length,
        serviceBreakdown,
        volunteerList,
      };
    },
  });
}
