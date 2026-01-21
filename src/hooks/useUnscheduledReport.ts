import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export interface UnscheduledCheckIn {
  id: string;
  volunteer_name: string;
  service_name: string;
  checked_in_at: string;
  method: string;
  source: 'system' | 'planning_center';
}

export function useUnscheduledReport(period: 'week' | 'month' | '3months') {
  return useQuery({
    queryKey: ['reports', 'unscheduled', period],
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

      const { data, error } = await supabase
        .from('check_ins')
        .select(`
          id,
          checked_in_at,
          method,
          volunteer_id,
          volunteer:profiles(full_name),
          service:services(name, scheduled_at)
        `)
        .eq('is_unscheduled', true)
        .gte('checked_in_at', startDate.toISOString())
        .lte('checked_in_at', endDate.toISOString())
        .order('checked_in_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.id,
        volunteer_name: item.volunteer?.full_name || 'Desconhecido',
        service_name: item.service?.name || 'Culto não identificado',
        checked_in_at: item.checked_in_at,
        method: item.method,
        // If volunteer_id is present, the volunteer has a system account
        // If null, they were checked in via volunteer_qrcodes (Planning Center only)
        source: item.volunteer_id ? 'system' : 'planning_center',
      })) as UnscheduledCheckIn[];
    },
  });
}
