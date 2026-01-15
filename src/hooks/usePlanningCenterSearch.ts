import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PlanningCenterPerson {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
}

export function useSearchPlanningCenter(query: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['planning-center-search', query],
    queryFn: async (): Promise<PlanningCenterPerson[]> => {
      const { data, error } = await supabase.functions.invoke('search-planning-center-people', {
        body: { query },
      });

      if (error) {
        console.error('Error searching Planning Center:', error);
        throw error;
      }

      return data.people || [];
    },
    enabled: enabled && query.trim().length >= 2,
    staleTime: 30000, // Cache for 30 seconds
  });
}

export function usePlanningCenterPerson(personId: string | null) {
  return useQuery({
    queryKey: ['planning-center-person', personId],
    queryFn: async (): Promise<PlanningCenterPerson | null> => {
      if (!personId) return null;

      const { data, error } = await supabase.functions.invoke('get-planning-center-person', {
        body: { person_id: personId },
      });

      if (error) {
        console.error('Error fetching Planning Center person:', error);
        throw error;
      }

      return data.person || null;
    },
    enabled: !!personId,
  });
}

export function useLinkPlanningCenter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      planningCenterId,
      fullName,
      avatarUrl,
    }: {
      userId: string;
      planningCenterId: string;
      fullName?: string;
      avatarUrl?: string | null;
    }) => {
      const updates: Record<string, any> = {
        planning_center_id: planningCenterId,
      };

      if (fullName) {
        updates.full_name = fullName;
      }

      if (avatarUrl) {
        updates.avatar_url = avatarUrl;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Perfil vinculado ao Planning Center!');
    },
    onError: (error) => {
      console.error('Error linking Planning Center:', error);
      toast.error('Erro ao vincular ao Planning Center');
    },
  });
}

export function useSyncFromPlanningCenter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      planningCenterId,
    }: {
      userId: string;
      planningCenterId: string;
    }) => {
      // First, get the person details from Planning Center
      const { data, error: fetchError } = await supabase.functions.invoke('get-planning-center-person', {
        body: { person_id: planningCenterId },
      });

      if (fetchError) throw fetchError;

      const person = data.person;
      if (!person) throw new Error('Pessoa não encontrada no Planning Center');

      // Update the profile with the fetched data
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: person.full_name,
          avatar_url: person.avatar_url,
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      return person;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Perfil sincronizado com o Planning Center!');
    },
    onError: (error) => {
      console.error('Error syncing from Planning Center:', error);
      toast.error('Erro ao sincronizar com o Planning Center');
    },
  });
}
