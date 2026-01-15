import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Service } from '@/types';

export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('scheduled_at', { ascending: true });
      
      if (error) throw error;
      return data as Service[];
    },
  });
}

export function useUpcomingServices() {
  return useQuery({
    queryKey: ['services', 'upcoming'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(10);
      
      if (error) throw error;
      return data as Service[];
    },
  });
}

export function useTodaysServices() {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  return useQuery({
    queryKey: ['services', 'today'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .gte('scheduled_at', startOfDay)
        .lt('scheduled_at', endOfDay)
        .order('scheduled_at', { ascending: true });
      
      if (error) throw error;
      return data as Service[];
    },
  });
}
