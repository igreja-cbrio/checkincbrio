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

function getStartDate(period: string): Date | null {
  if (period === 'all') return null;
  
  const now = new Date();
  switch (period) {
    case '7days':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30days':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90days':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

export function useMyCheckInHistory(userId: string | undefined, period: string = 'all') {
  return useQuery({
    queryKey: ['my-check-in-history', userId, period],
    queryFn: async () => {
      if (!userId) return [];

      const startDate = getStartDate(period);

      // Query 1: Check-ins where volunteer_id matches
      let query1 = supabase
        .from('check_ins')
        .select(`
          id,
          checked_in_at,
          method,
          is_unscheduled,
          service:services(id, name, scheduled_at, service_type_name),
          schedule:schedules(team_name, position_name)
        `)
        .eq('volunteer_id', userId)
        .order('checked_in_at', { ascending: false });

      if (startDate) {
        query1 = query1.gte('checked_in_at', startDate.toISOString());
      }

      // Query 2: Get user's schedule IDs first
      const { data: userSchedules } = await supabase
        .from('schedules')
        .select('id')
        .eq('volunteer_id', userId);

      const scheduleIds = userSchedules?.map(s => s.id) || [];

      let scheduleCheckIns: CheckInHistoryItem[] = [];
      
      if (scheduleIds.length > 0) {
        let query2 = supabase
          .from('check_ins')
          .select(`
            id,
            checked_in_at,
            method,
            is_unscheduled,
            service:services(id, name, scheduled_at, service_type_name),
            schedule:schedules(team_name, position_name)
          `)
          .in('schedule_id', scheduleIds)
          .order('checked_in_at', { ascending: false });

        if (startDate) {
          query2 = query2.gte('checked_in_at', startDate.toISOString());
        }

        const { data: data2, error: error2 } = await query2;
        if (error2) throw error2;
        scheduleCheckIns = (data2 || []) as CheckInHistoryItem[];
      }

      const { data: data1, error: error1 } = await query1;
      if (error1) throw error1;

      // Merge and deduplicate by id
      const allCheckIns = [...(data1 || []) as CheckInHistoryItem[], ...scheduleCheckIns];
      const uniqueCheckIns = allCheckIns.reduce((acc, item) => {
        if (!acc.find(i => i.id === item.id)) {
          acc.push(item);
        }
        return acc;
      }, [] as CheckInHistoryItem[]);

      // Sort by date descending
      return uniqueCheckIns.sort((a, b) => 
        new Date(b.checked_in_at).getTime() - new Date(a.checked_in_at).getTime()
      );
    },
    enabled: !!userId,
  });
}

export function useVolunteerCheckInHistory(volunteerId: string | undefined, period: string = 'all') {
  return useQuery({
    queryKey: ['volunteer-check-in-history', volunteerId, period],
    queryFn: async () => {
      if (!volunteerId) return [];

      const startDate = getStartDate(period);

      // Query 1: Check-ins where volunteer_id matches
      let query1 = supabase
        .from('check_ins')
        .select(`
          id,
          checked_in_at,
          method,
          is_unscheduled,
          service:services(id, name, scheduled_at, service_type_name),
          schedule:schedules(team_name, position_name)
        `)
        .eq('volunteer_id', volunteerId)
        .order('checked_in_at', { ascending: false });

      if (startDate) {
        query1 = query1.gte('checked_in_at', startDate.toISOString());
      }

      // Query 2: Get volunteer's schedule IDs
      const { data: volunteerSchedules } = await supabase
        .from('schedules')
        .select('id')
        .eq('volunteer_id', volunteerId);

      const scheduleIds = volunteerSchedules?.map(s => s.id) || [];

      let scheduleCheckIns: CheckInHistoryItem[] = [];
      
      if (scheduleIds.length > 0) {
        let query2 = supabase
          .from('check_ins')
          .select(`
            id,
            checked_in_at,
            method,
            is_unscheduled,
            service:services(id, name, scheduled_at, service_type_name),
            schedule:schedules(team_name, position_name)
          `)
          .in('schedule_id', scheduleIds)
          .order('checked_in_at', { ascending: false });

        if (startDate) {
          query2 = query2.gte('checked_in_at', startDate.toISOString());
        }

        const { data: data2, error: error2 } = await query2;
        if (error2) throw error2;
        scheduleCheckIns = (data2 || []) as CheckInHistoryItem[];
      }

      const { data: data1, error: error1 } = await query1;
      if (error1) throw error1;

      // Merge and deduplicate
      const allCheckIns = [...(data1 || []) as CheckInHistoryItem[], ...scheduleCheckIns];
      const uniqueCheckIns = allCheckIns.reduce((acc, item) => {
        if (!acc.find(i => i.id === item.id)) {
          acc.push(item);
        }
        return acc;
      }, [] as CheckInHistoryItem[]);

      return uniqueCheckIns.sort((a, b) => 
        new Date(b.checked_in_at).getTime() - new Date(a.checked_in_at).getTime()
      );
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

export function useVolunteerHistoryByName(volunteerName: string | undefined, period: string = 'all') {
  return useQuery({
    queryKey: ['volunteer-history-by-name', volunteerName, period],
    queryFn: async () => {
      if (!volunteerName) return [];

      const startDate = getStartDate(period);

      // First get schedules for this volunteer name
      const { data: schedules, error: schedError } = await supabase
        .from('schedules')
        .select('id')
        .eq('volunteer_name', volunteerName);

      if (schedError) throw schedError;

      const scheduleIds = schedules?.map(s => s.id) || [];

      if (scheduleIds.length === 0) return [];

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
        .in('schedule_id', scheduleIds)
        .order('checked_in_at', { ascending: false });

      if (startDate) {
        query = query.gte('checked_in_at', startDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as CheckInHistoryItem[];
    },
    enabled: !!volunteerName,
  });
}
