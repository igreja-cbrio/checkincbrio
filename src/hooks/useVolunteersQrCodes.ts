import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface VolunteerWithQrCode {
  id: string;
  full_name: string;
  email: string;
  qr_code: string | null;
  planning_center_id: string | null;
}

export function useVolunteersQrCodes() {
  return useQuery({
    queryKey: ['volunteers-qrcodes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, qr_code, planning_center_id')
        .order('full_name', { ascending: true });

      if (error) throw error;
      return data as VolunteerWithQrCode[];
    },
  });
}
