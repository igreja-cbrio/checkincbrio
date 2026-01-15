import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CheckInHistoryItem {
  id: string;
  checked_in_at: string;
  method: string;
  is_unscheduled: boolean;
  service: {
    id: string;
    name: string;
    scheduled_at: string;
    service_type_name: string | null;
  } | null;
  schedule: {
    team_name: string | null;
    position_name: string | null;
  } | null;
}

export function useMyCheckInHistory(userId: string | undefined, period: string = 'all') {
  return useQuery({
    queryKey: ['my-check-in-history', userId, period],
    queryFn: async () => {
      if (!userId) return [];

      let query = supabase
        .from('check_ins')
        .select(`
          id,
          checked_in_at,
          method,
          is_unscheduled,
          service:services(id, name, scheduled_at, service_type_name),
          schedule:schedules(team_name, position_name)
        `)
        .or(`volunteer_id.eq.${userId},schedule_id.in.(select id from schedules where volunteer_id='${userId}')`)
        .order('checked_in_at', { ascending: false });

      // Apply period filter
      if (period !== 'all') {
        const now = new Date();
        let startDate: Date;
        
        switch (period) {
          case '7days':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case '30days':
            startDate = new Date(now.setDate(now.getDate() - 30));
            break;
          case '90days':
            startDate = new Date(now.setDate(now.getDate() - 90));
            break;
          default:
            startDate = new Date(0);
        }
        
        query = query.gte('checked_in_at', startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as CheckInHistoryItem[];
    },
    enabled: !!userId,
  });
}

export function useVolunteerCheckInHistory(volunteerId: string | undefined, period: string = 'all') {
  return useQuery({
    queryKey: ['volunteer-check-in-history', volunteerId, period],
    queryFn: async () => {
      if (!volunteerId) return [];

      let query = supabase
        .from('check_ins')
        .select(`
          id,
          checked_in_at,
          method,
          is_unscheduled,
          service:services(id, name, scheduled_at, service_type_name),
          schedule:schedules(team_name, position_name)
        `)
        .or(`volunteer_id.eq.${volunteerId},schedule_id.in.(select id from schedules where volunteer_id='${volunteerId}')`)
        .order('checked_in_at', { ascending: false });

      // Apply period filter
      if (period !== 'all') {
        const now = new Date();
        let startDate: Date;
        
        switch (period) {
          case '7days':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case '30days':
            startDate = new Date(now.setDate(now.getDate() - 30));
            break;
          case '90days':
            startDate = new Date(now.setDate(now.getDate() - 90));
            break;
          default:
            startDate = new Date(0);
        }
        
        query = query.gte('checked_in_at', startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as CheckInHistoryItem[];
    },
    enabled: !!volunteerId,
  });
}

export function useVolunteerProfile(volunteerId: string | undefined) {
  return useQuery({
    queryKey: ['volunteer-profile', volunteerId],
    queryFn: async () => {
      if (!volunteerId) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', volunteerId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!volunteerId,
  });
}
