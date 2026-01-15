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
  service_name: string;
  scheduled_at: string;
  total_scheduled: number;
  total_checked_in: number;
  attendance_rate: number;
}

export function useAttendanceReport(period: 'week' | 'month' | '3months') {
  return useQuery({
    queryKey: ['reports', 'attendance', period],
    queryFn: async () => {
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
          startDate = subMonths(startOfMonth(now), 2);
          endDate = endOfMonth(now);
          break;
      }

      // Get all schedules in the period
      const { data: schedules, error } = await supabase
        .from('schedules')
        .select(`
          id,
          volunteer_id,
          volunteer_name,
          service:services!inner(scheduled_at),
          check_in:check_ins(id)
        `)
        .gte('service.scheduled_at', startDate.toISOString())
        .lte('service.scheduled_at', endDate.toISOString());

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

export function useServiceReport(period: 'week' | 'month' | '3months') {
  return useQuery({
    queryKey: ['reports', 'services', period],
    queryFn: async () => {
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
          startDate = subMonths(startOfMonth(now), 2);
          endDate = endOfMonth(now);
          break;
      }

      // Get all services in the period with their schedules
      const { data: services, error } = await supabase
        .from('services')
        .select(`
          id,
          name,
          scheduled_at,
          schedules(
            id,
            check_in:check_ins(id)
          )
        `)
        .gte('scheduled_at', startDate.toISOString())
        .lte('scheduled_at', endDate.toISOString())
        .order('scheduled_at', { ascending: false });

      if (error) throw error;

      const report: ServiceReport[] = services?.map((service: any) => {
        const totalScheduled = service.schedules?.length || 0;
        const totalCheckedIn = service.schedules?.filter((s: any) => s.check_in && s.check_in.length > 0).length || 0;
        
        return {
          service_name: service.name,
          scheduled_at: service.scheduled_at,
          total_scheduled: totalScheduled,
          total_checked_in: totalCheckedIn,
          attendance_rate: totalScheduled > 0 ? (totalCheckedIn / totalScheduled) * 100 : 0,
        };
      }) || [];

      return report;
    },
  });
}
