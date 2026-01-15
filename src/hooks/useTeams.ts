import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedules')
        .select('team_name')
        .not('team_name', 'is', null)
        .order('team_name');

      if (error) throw error;

      // Get unique team names
      const uniqueTeams = [...new Set(data?.map(s => s.team_name).filter(Boolean) as string[])];
      return uniqueTeams.sort();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
