import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subMonths } from 'date-fns';

export interface VolunteerWithQrCode {
  id: string;
  full_name: string;
  email: string;
  planning_center_id: string | null;
  qr_code: string | null;
  avatar_url: string | null;
  source: 'profile' | 'volunteer_qrcode';
}

interface VolunteerQrCodeRow {
  id: string;
  planning_center_person_id: string;
  volunteer_name: string;
  qr_code: string;
  avatar_url: string | null;
}

export function useVolunteersQrCodes() {
  return useQuery({
    queryKey: ['volunteers-qrcodes'],
    queryFn: async (): Promise<VolunteerWithQrCode[]> => {
      const threeMonthsAgo = subMonths(new Date(), 3).toISOString();
      
      // Get active PC person IDs from schedules in last 3 months
      const { data: activeSchedules, error: schedulesError } = await supabase
        .from('schedules')
        .select(`
          planning_center_person_id,
          service_id,
          services!inner(scheduled_at)
        `)
        .gte('services.scheduled_at', threeMonthsAgo);

      if (schedulesError) {
        console.error('Error fetching active schedules:', schedulesError);
        throw schedulesError;
      }

      // Get unique active PC person IDs
      const activePcIds = new Set(
        activeSchedules?.map(s => s.planning_center_person_id).filter(Boolean) || []
      );

      // Get profiles (users with accounts)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, planning_center_id, qr_code, avatar_url');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      // Get volunteer QR codes (PC volunteers without accounts)
      const { data: volunteerQrCodes, error: qrError } = await supabase
        .from('volunteer_qrcodes')
        .select('id, planning_center_person_id, volunteer_name, qr_code, avatar_url');

      if (qrError) {
        console.error('Error fetching volunteer QR codes:', qrError);
        throw qrError;
      }

      // Build combined list, avoiding duplicates
      const combinedMap = new Map<string, VolunteerWithQrCode>();
      
      // Add profiles first (they have priority as they have accounts)
      for (const profile of profiles || []) {
        const key = profile.planning_center_id || `profile_${profile.id}`;
        combinedMap.set(key, {
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          planning_center_id: profile.planning_center_id,
          qr_code: profile.qr_code,
          avatar_url: profile.avatar_url,
          source: 'profile',
        });
      }

      // Add volunteer QR codes (only if they're active and not already in profiles)
      for (const volunteer of (volunteerQrCodes as VolunteerQrCodeRow[]) || []) {
        const key = volunteer.planning_center_person_id;
        
        // Skip if already added from profiles or not active in last 3 months
        if (combinedMap.has(key)) continue;
        if (!activePcIds.has(key)) continue;
        
        combinedMap.set(key, {
          id: volunteer.id,
          full_name: volunteer.volunteer_name,
          email: '', // No email for PC-only volunteers
          planning_center_id: volunteer.planning_center_person_id,
          qr_code: volunteer.qr_code,
          avatar_url: volunteer.avatar_url,
          source: 'volunteer_qrcode',
        });
      }

      // Sort by name
      return Array.from(combinedMap.values()).sort((a, b) => 
        a.full_name.localeCompare(b.full_name)
      );
    },
  });
}

export function useCreateVolunteerQrCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      planning_center_person_id,
      volunteer_name,
      avatar_url,
    }: {
      planning_center_person_id: string;
      volunteer_name: string;
      avatar_url?: string | null;
    }) => {
      const { data, error } = await supabase.functions.invoke('create-volunteer-qrcode', {
        body: { planning_center_person_id, volunteer_name, avatar_url },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data.volunteer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['volunteers-qrcodes'] });
    },
  });
}
