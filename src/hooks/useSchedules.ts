import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Schedule, ScheduleWithDetails, CheckIn } from '@/types';
import { saveMySchedules, getMySchedules } from '@/services/offlineStorage';

export function useServiceSchedules(serviceId: string | undefined) {
  return useQuery({
    queryKey: ['schedules', serviceId],
    enabled: !!serviceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedules')
        .select(`
          *,
          service:services(*),
          check_in:check_ins(*)
        `)
        .eq('service_id', serviceId)
        .order('team_name', { ascending: true });
      
      if (error) throw error;
      
      // Transform the data to match our types
      return data.map((schedule: any) => ({
        ...schedule,
        service: schedule.service,
        check_in: schedule.check_in?.[0] || null,
      })) as ScheduleWithDetails[];
    },
  });
}

export function useMySchedules(userId: string | undefined) {
  return useQuery({
    queryKey: ['schedules', 'my', userId],
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    placeholderData: () => {
      // Return cached data while fetching
      const cached = getMySchedules();
      return cached.length > 0 ? cached : undefined;
    },
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedules')
        .select(`
          *,
          service:services(*),
          check_in:check_ins(*)
        `)
        .eq('volunteer_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const schedules = data.map((schedule: any) => ({
        ...schedule,
        service: schedule.service,
        check_in: schedule.check_in?.[0] || null,
      })) as ScheduleWithDetails[];

      // Save for offline access
      saveMySchedules(schedules);
      
      return schedules;
    },
  });
}

interface CheckInParams {
  scheduleId?: string;
  volunteerId?: string;
  serviceId?: string;
  method: 'qr_code' | 'manual' | 'facial';
  isUnscheduled?: boolean;
}

export function useCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      scheduleId, 
      volunteerId,
      serviceId,
      method,
      isUnscheduled = false,
    }: CheckInParams) => {
      const { data, error } = await supabase
        .from('check_ins')
        .insert({
          schedule_id: scheduleId || null,
          volunteer_id: volunteerId || null,
          service_id: serviceId || null,
          method,
          is_unscheduled: isUnscheduled,
        })
        .select()
        .single();
      
      if (error) {
        // Handle unique constraint violation (PostgreSQL error code 23505)
        if (error.code === '23505') {
          throw new Error('Check-in já foi realizado');
        }
        throw error;
      }

      // If checking in a scheduled volunteer, confirm if pending
      if (scheduleId) {
        await supabase
          .from('schedules')
          .update({ confirmation_status: 'confirmed' })
          .eq('id', scheduleId)
          .eq('confirmation_status', 'pending');
      }

      return data as CheckIn;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['check-ins'] });
    },
  });
}

export interface QrCodeResult {
  schedule?: any;
  profile: { 
    id: string | null; 
    planning_center_id: string | null; 
    full_name?: string;
    type: 'profile' | 'volunteer_qrcode';
  };
  isUnscheduled: boolean;
  volunteerName: string;
}

export function useScheduleByQrCode() {
  return useMutation({
    mutationFn: async (qrCode: string): Promise<QrCodeResult> => {
      // First try to find in profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, planning_center_id, full_name')
        .eq('qr_code', qrCode)
        .maybeSingle();
      
      let volunteerData: {
        type: 'profile' | 'volunteer_qrcode';
        id: string | null;
        planning_center_id: string | null;
        name: string;
      };

      if (profile) {
        volunteerData = {
          type: 'profile',
          id: profile.id,
          planning_center_id: profile.planning_center_id,
          name: profile.full_name || 'Voluntário'
        };
      } else {
        // If not found in profiles, try volunteer_qrcodes table
        const { data: volunteerQr } = await supabase
          .from('volunteer_qrcodes')
          .select('id, planning_center_person_id, volunteer_name')
          .eq('qr_code', qrCode)
          .maybeSingle();

        if (!volunteerQr) {
          throw new Error('Voluntário não encontrado');
        }

        volunteerData = {
          type: 'volunteer_qrcode',
          id: null, // No user account
          planning_center_id: volunteerQr.planning_center_person_id,
          name: volunteerQr.volunteer_name
        };
      }

      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      // Find today's schedule for this volunteer
      let scheduleQuery = supabase
        .from('schedules')
        .select(`
          *,
          service:services!inner(*)
        `)
        .gte('service.scheduled_at', startOfDay)
        .lt('service.scheduled_at', endOfDay);

      // Build the filter based on available data
      if (volunteerData.type === 'profile' && volunteerData.id) {
        scheduleQuery = scheduleQuery.or(
          `volunteer_id.eq.${volunteerData.id},planning_center_person_id.eq.${volunteerData.planning_center_id}`
        );
      } else if (volunteerData.planning_center_id) {
        scheduleQuery = scheduleQuery.eq('planning_center_person_id', volunteerData.planning_center_id);
      }

      const { data: schedules, error: scheduleError } = await scheduleQuery;
      
      if (scheduleError) throw scheduleError;

      const profileResult = {
        id: volunteerData.id,
        planning_center_id: volunteerData.planning_center_id,
        full_name: volunteerData.name,
        type: volunteerData.type
      };

      // No schedule found for today - return as unscheduled
      if (!schedules || schedules.length === 0) {
        return {
          profile: profileResult,
          isUnscheduled: true,
          volunteerName: volunteerData.name,
        };
      }

      // Check if already checked in
      const { data: existingCheckIns } = await supabase
        .from('check_ins')
        .select('*')
        .in('schedule_id', schedules.map(s => s.id));

      const uncheckedSchedule = schedules.find(s => 
        !existingCheckIns?.some(c => c.schedule_id === s.id)
      );

      // All schedules checked in - also check for unscheduled check-in today
      if (!uncheckedSchedule) {
        // Check if they already have an unscheduled check-in today
        if (volunteerData.id) {
          const { data: unscheduledCheckIn } = await supabase
            .from('check_ins')
            .select('*')
            .eq('volunteer_id', volunteerData.id)
            .eq('is_unscheduled', true)
            .gte('checked_in_at', startOfDay)
            .lt('checked_in_at', endOfDay)
            .maybeSingle();

          if (unscheduledCheckIn) {
            throw new Error('Voluntário já fez check-in hoje');
          }
        }

        throw new Error('Voluntário já fez check-in em todas as escalas de hoje');
      }

      return {
        schedule: uncheckedSchedule,
        profile: profileResult,
        isUnscheduled: false,
        volunteerName: uncheckedSchedule.volunteer_name,
      };
    },
  });
}

export function useUnscheduledCheckIns(serviceId: string | undefined) {
  return useQuery({
    queryKey: ['check-ins', 'unscheduled', serviceId],
    enabled: !!serviceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('check_ins')
        .select(`
          *,
          volunteer:profiles(id, full_name),
          service:services(id, name, scheduled_at)
        `)
        .eq('service_id', serviceId)
        .eq('is_unscheduled', true)
        .order('checked_in_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}
