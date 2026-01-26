import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SyncLog {
  id: string;
  sync_type: string;
  services_synced: number;
  schedules_synced: number;
  qrcodes_generated: number;
  status: string;
  created_at: string;
}

export function useLastSync() {
  return useQuery({
    queryKey: ['last-sync'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as SyncLog | null;
    },
    refetchInterval: 60000, // Refetch every minute
  });
}
