import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SyncResult {
  success: boolean;
  services: number;
  newSchedules: number;
  error?: string;
}

export function useSyncPlanningCenter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<SyncResult> => {
      const { data, error } = await supabase.functions.invoke('sync-planning-center', {
        method: 'POST',
      });
      
      if (error) {
        throw new Error(error.message || 'Erro ao sincronizar');
      }
      
      if (data?.error) {
        throw new Error(data.error);
      }
      
      return data as SyncResult;
    },
    onSuccess: () => {
      // Invalidate services and schedules queries
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}
