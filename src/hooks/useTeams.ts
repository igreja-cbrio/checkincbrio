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

      // Split concatenated team names and get unique individual names
      const allTeamNames = data
        ?.flatMap(s => (s.team_name || '').split(',').map(t => t.trim()))
        .filter(Boolean) as string[];
      const uniqueTeams = [...new Set(allTeamNames)].sort();
      return uniqueTeams;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
