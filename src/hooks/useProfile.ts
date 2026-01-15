import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProfileStats {
  totalCheckIns: number;
  scheduledCheckIns: number;
  unscheduledCheckIns: number;
  totalScheduled: number;
  attendanceRate: number;
  currentMonthCheckIns: number;
}

export function useProfileStats(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile-stats', userId],
    queryFn: async (): Promise<ProfileStats> => {
      if (!userId) {
        return {
          totalCheckIns: 0,
          scheduledCheckIns: 0,
          unscheduledCheckIns: 0,
          totalScheduled: 0,
          attendanceRate: 0,
          currentMonthCheckIns: 0,
        };
      }

      // Get all check-ins for the user
      const { data: checkIns, error: checkInsError } = await supabase
        .from('check_ins')
        .select('id, is_unscheduled, checked_in_at, schedule_id')
        .or(`volunteer_id.eq.${userId},schedule_id.in.(select id from schedules where volunteer_id='${userId}')`);

      if (checkInsError) throw checkInsError;

      // Get all schedules for the user
      const { data: schedules, error: schedulesError } = await supabase
        .from('schedules')
        .select('id, service:services(scheduled_at)')
        .eq('volunteer_id', userId);

      if (schedulesError) throw schedulesError;

      // Calculate stats
      const totalCheckIns = checkIns?.length || 0;
      const scheduledCheckIns = checkIns?.filter(c => !c.is_unscheduled).length || 0;
      const unscheduledCheckIns = checkIns?.filter(c => c.is_unscheduled).length || 0;
      
      // Only count past schedules for attendance rate
      const now = new Date();
      const pastSchedules = schedules?.filter((s: any) => 
        new Date(s.service?.scheduled_at) < now
      ) || [];
      const totalScheduled = pastSchedules.length;
      
      const attendanceRate = totalScheduled > 0 
        ? Math.round((scheduledCheckIns / totalScheduled) * 100) 
        : 0;

      // Current month check-ins
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);
      const currentMonthCheckIns = checkIns?.filter(c => 
        new Date(c.checked_in_at) >= currentMonth
      ).length || 0;

      return {
        totalCheckIns,
        scheduledCheckIns,
        unscheduledCheckIns,
        totalScheduled,
        attendanceRate,
        currentMonthCheckIns,
      };
    },
    enabled: !!userId,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, fullName }: { userId: string; fullName: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
