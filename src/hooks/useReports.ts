import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export interface AttendanceReport {
  volunteer_id: string | null;
  volunteer_name: string;
  total_scheduled: number;
  total_checked_in: number;
  attendance_rate: number;
}

export interface ServiceReport {
  service_id: string;
  service_name: string;
  scheduled_at: string;
  total_scheduled: number;
  total_checked_in: number;
  attendance_rate: number;
}

export type ReportPeriod = 'week' | 'month' | '3months' | 'custom';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

function getDateRange(period: ReportPeriod, customRange?: DateRange) {
  if (period === 'custom' && customRange) {
    return { startDate: customRange.startDate, endDate: customRange.endDate };
  }

  const now = new Date();
  let startDate: Date;
  let endDate = now;

  switch (period) {
    case 'week':
      startDate = startOfWeek(now, { weekStartsOn: 0 });
      endDate = endOfWeek(now, { weekStartsOn: 0 });
      break;
    case 'month':
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      break;
    case '3months':
    default:
      startDate = subMonths(startOfMonth(now), 2);
      endDate = endOfMonth(now);
      break;
  }

  return { startDate, endDate };
}

export function useAttendanceReport(
  period: ReportPeriod, 
  teamName?: string,
  customRange?: DateRange
) {
  return useQuery({
    queryKey: ['reports', 'attendance', period, teamName, customRange?.startDate?.toISOString(), customRange?.endDate?.toISOString()],
    queryFn: async () => {
      const { startDate, endDate } = getDateRange(period, customRange);

      // Build query
      let query = supabase
        .from('schedules')
        .select(`
          id,
          volunteer_id,
          volunteer_name,
          team_name,
          service:services!inner(scheduled_at),
          check_in:check_ins(id)
        `)
        .gte('service.scheduled_at', startDate.toISOString())
        .lte('service.scheduled_at', endDate.toISOString());

      // Filter by team if specified
      if (teamName) {
        query = query.eq('team_name', teamName);
      }

      const { data: schedules, error } = await query;

      if (error) throw error;

      // Group by volunteer
      const volunteerMap = new Map<string, { volunteer_id: string | null; scheduled: number; checked_in: number }>();

      schedules?.forEach((schedule: any) => {
        const name = schedule.volunteer_name;
        if (!volunteerMap.has(name)) {
          volunteerMap.set(name, { volunteer_id: schedule.volunteer_id, scheduled: 0, checked_in: 0 });
        }
        const stats = volunteerMap.get(name)!;
        stats.scheduled++;
        // Update volunteer_id if we find one (in case first entry was null)
        if (schedule.volunteer_id && !stats.volunteer_id) {
          stats.volunteer_id = schedule.volunteer_id;
        }
        if (schedule.check_in && schedule.check_in.length > 0) {
          stats.checked_in++;
        }
      });

      const report: AttendanceReport[] = Array.from(volunteerMap.entries())
        .map(([name, stats]) => ({
          volunteer_id: stats.volunteer_id,
          volunteer_name: name,
          total_scheduled: stats.scheduled,
          total_checked_in: stats.checked_in,
          attendance_rate: stats.scheduled > 0 ? (stats.checked_in / stats.scheduled) * 100 : 0,
        }))
        .sort((a, b) => b.attendance_rate - a.attendance_rate);

      return report;
    },
  });
}

export function useServiceReport(
  period: ReportPeriod, 
  teamName?: string,
  customRange?: DateRange
) {
  return useQuery({
    queryKey: ['reports', 'services', period, teamName, customRange?.startDate?.toISOString(), customRange?.endDate?.toISOString()],
    queryFn: async () => {
      const { startDate, endDate } = getDateRange(period, customRange);

      // Get all services in the period with their schedules
      const { data: services, error } = await supabase
        .from('services')
        .select(`
          id,
          name,
          scheduled_at,
          schedules(
            id,
            team_name,
            check_in:check_ins(id)
          )
        `)
        .gte('scheduled_at', startDate.toISOString())
        .lte('scheduled_at', endDate.toISOString())
        .order('scheduled_at', { ascending: false });

      if (error) throw error;

      const report: ServiceReport[] = services?.map((service: any) => {
        // Filter schedules by team if specified
        const filteredSchedules = teamName
          ? service.schedules?.filter((s: any) => s.team_name === teamName) || []
          : service.schedules || [];
        
        const totalScheduled = filteredSchedules.length;
        const totalCheckedIn = filteredSchedules.filter((s: any) => s.check_in && s.check_in.length > 0).length;
        
        return {
          service_id: service.id,
          service_name: service.name,
          scheduled_at: service.scheduled_at,
          total_scheduled: totalScheduled,
          total_checked_in: totalCheckedIn,
          attendance_rate: totalScheduled > 0 ? (totalCheckedIn / totalScheduled) * 100 : 0,
        };
      }).filter((s: ServiceReport) => s.total_scheduled > 0) || [];

      return report;
    },
  });
}
