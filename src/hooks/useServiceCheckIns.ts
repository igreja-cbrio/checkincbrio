import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ServiceCheckInItem {
  scheduleId: string;
  volunteerName: string;
  volunteerId: string | null;
  teamName: string | null;
  positionName: string | null;
  confirmationStatus: string;
  checkedIn: boolean;
  checkInTime: string | null;
  checkInMethod: 'qr_code' | 'manual' | 'facial' | null;
  planningCenterId: string;
}

export interface ServiceCheckInSummary {
  serviceId: string;
  serviceName: string;
  serviceTypeName: string | null;
  scheduledAt: string;
  totalScheduled: number;
  totalCheckedIn: number;
  attendanceRate: number;
  items: ServiceCheckInItem[];
  teams: string[];
}

export function useServiceCheckIns(serviceId: string | undefined) {
  return useQuery({
    queryKey: ['service-checkins', serviceId],
    queryFn: async (): Promise<ServiceCheckInSummary | null> => {
      if (!serviceId) return null;

      // Fetch service details
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .maybeSingle();

      if (serviceError) throw serviceError;
      if (!service) return null;

      // Fetch all schedules for this service with their check-ins
      const { data: schedules, error: schedulesError } = await supabase
        .from('schedules')
        .select(`
          id,
          volunteer_id,
          volunteer_name,
          team_name,
          position_name,
          confirmation_status,
          planning_center_person_id,
          check_ins(
            id,
            checked_in_at,
            method
          )
        `)
        .eq('service_id', serviceId)
        .order('team_name', { ascending: true, nullsFirst: false })
        .order('volunteer_name', { ascending: true });

      if (schedulesError) throw schedulesError;

      // Also get unscheduled check-ins for this service
      const { data: unscheduledCheckIns } = await supabase
        .from('check_ins')
        .select(`
          id,
          volunteer_id,
          checked_in_at,
          method,
          profiles:volunteer_id(full_name, planning_center_id)
        `)
        .eq('service_id', serviceId)
        .eq('is_unscheduled', true);

      const items: ServiceCheckInItem[] = [];
      const teamSet = new Set<string>();
      let checkedInCount = 0;

      // Process scheduled volunteers
      for (const schedule of schedules || []) {
        const checkIn = schedule.check_ins?.[0];
        const isCheckedIn = !!checkIn;
        if (isCheckedIn) checkedInCount++;
        
        if (schedule.team_name) {
          teamSet.add(schedule.team_name);
        }

        items.push({
          scheduleId: schedule.id,
          volunteerName: schedule.volunteer_name,
          volunteerId: schedule.volunteer_id,
          teamName: schedule.team_name,
          positionName: schedule.position_name,
          confirmationStatus: schedule.confirmation_status || 'unknown',
          checkedIn: isCheckedIn,
          checkInTime: checkIn?.checked_in_at || null,
          checkInMethod: checkIn?.method as 'qr_code' | 'manual' | 'facial' | null,
          planningCenterId: schedule.planning_center_person_id,
        });
      }

      // Add unscheduled check-ins to the list
      for (const checkIn of unscheduledCheckIns || []) {
        const profile = checkIn.profiles as any;
        
        // Skip if already in the list (shouldn't happen but safety check)
        const exists = items.some(
          item => item.volunteerId === checkIn.volunteer_id
        );
        if (exists) continue;

        checkedInCount++;
        items.push({
          scheduleId: `unscheduled-${checkIn.id}`,
          volunteerName: profile?.full_name || 'Voluntário sem nome',
          volunteerId: checkIn.volunteer_id,
          teamName: null,
          positionName: null,
          confirmationStatus: 'unscheduled',
          checkedIn: true,
          checkInTime: checkIn.checked_in_at,
          checkInMethod: checkIn.method as 'qr_code' | 'manual' | 'facial',
          planningCenterId: profile?.planning_center_id || '',
        });
      }

      const totalScheduled = schedules?.length || 0;
      const attendanceRate = totalScheduled > 0 
        ? (checkedInCount / totalScheduled) * 100 
        : 0;

      return {
        serviceId: service.id,
        serviceName: service.name,
        serviceTypeName: service.service_type_name,
        scheduledAt: service.scheduled_at,
        totalScheduled,
        totalCheckedIn: checkedInCount,
        attendanceRate,
        items,
        teams: Array.from(teamSet).sort(),
      };
    },
    enabled: !!serviceId,
  });
}

// Hook to get list of services for selection
export function useServicesForHistory(daysBack: number = 30) {
  return useQuery({
    queryKey: ['services-for-history', daysBack],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const { data, error } = await supabase
        .from('services')
        .select('id, name, service_type_name, scheduled_at')
        .gte('scheduled_at', startDate.toISOString())
        .order('scheduled_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}
