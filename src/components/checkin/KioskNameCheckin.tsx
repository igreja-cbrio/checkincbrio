import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { useServiceSchedules, useCheckIn } from '@/hooks/useSchedules';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SuccessOverlay } from './SuccessOverlay';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SuccessData {
  volunteerName: string;
  teamName?: string | null;
  positionName?: string | null;
}

interface UnscheduledConfirm {
  volunteerId?: string;
  planningCenterId?: string;
  volunteerName: string;
}

interface KioskNameCheckinProps {
  serviceId: string;
}

export function KioskNameCheckin({ serviceId }: KioskNameCheckinProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [unscheduledConfirm, setUnscheduledConfirm] = useState<UnscheduledConfirm | null>(null);

  const { data: schedules, isLoading } = useServiceSchedules(serviceId);
  const checkInMutation = useCheckIn();

  // Fetch all volunteers for unscheduled lookup
  const { data: allVolunteers } = useQuery({
    queryKey: ['profiles', 'volunteers'],
    enabled: searchTerm.trim().length >= 2,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, planning_center_id')
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  const { data: volunteerQrCodes } = useQuery({
    queryKey: ['volunteer-qrcodes', 'all'],
    enabled: searchTerm.trim().length >= 2,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('volunteer_qrcodes')
        .select('id, planning_center_person_id, volunteer_name')
        .order('volunteer_name');
      if (error) throw error;
      return data;
    },
  });

  const filtered = schedules?.filter(s =>
    s.volunteer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.team_name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Unscheduled volunteers (not in schedule)
  const scheduledIds = new Set(schedules?.map(s => s.volunteer_id).filter(Boolean) || []);
  const scheduledPcIds = new Set(schedules?.map(s => s.planning_center_person_id).filter(Boolean) || []);
  const profilePcIds = new Set(allVolunteers?.map(v => v.planning_center_id).filter(Boolean) || []);

  const unscheduledVolunteers = searchTerm.trim().length >= 2 ? [
    ...(allVolunteers?.filter(v =>
      !scheduledIds.has(v.id) &&
      v.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    ).map(v => ({ id: v.id, name: v.full_name, pcId: v.planning_center_id })) || []),
    ...(volunteerQrCodes?.filter(v =>
      !scheduledPcIds.has(v.planning_center_person_id) &&
      !profilePcIds.has(v.planning_center_person_id) &&
      v.volunteer_name.toLowerCase().includes(searchTerm.toLowerCase())
    ).map(v => ({ id: undefined as string | undefined, name: v.volunteer_name, pcId: v.planning_center_person_id })) || []),
  ].sort((a, b) => a.name.localeCompare(b.name)) : [];

  const handleScheduledCheckIn = useCallback(async (schedule: any) => {
    if (schedule.check_in) return;
    try {
      await checkInMutation.mutateAsync({
        scheduleId: schedule.id,
        volunteerId: schedule.volunteer_id || undefined,
        serviceId,
        method: 'manual',
      });
      setSuccessData({
        volunteerName: schedule.volunteer_name,
        teamName: schedule.team_name,
        positionName: schedule.position_name,
      });
      setSearchTerm('');
    } catch (error: any) {
      if (error.message?.includes('já')) {
        toast.info(error.message);
      } else {
        toast.error('Erro ao fazer check-in');
      }
    }
  }, [checkInMutation, serviceId]);

  const handleUnscheduledConfirm = useCallback(async () => {
    if (!unscheduledConfirm) return;
    try {
      await checkInMutation.mutateAsync({
        volunteerId: unscheduledConfirm.volunteerId,
        serviceId,
        method: 'manual',
        isUnscheduled: true,
      });
      setSuccessData({
        volunteerName: unscheduledConfirm.volunteerName,
      });
      setSearchTerm('');
    } catch (error: any) {
      if (error.message?.includes('já')) {
        toast.info(error.message);
      } else {
        toast.error('Erro ao fazer check-in');
      }
    } finally {
      setUnscheduledConfirm(null);
    }
  }, [unscheduledConfirm, checkInMutation, serviceId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar seu nome..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-12 h-14 text-lg rounded-xl"
          autoFocus
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {filtered.map((schedule) => (
          <button
            key={schedule.id}
            className="w-full flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors active:scale-[0.98] disabled:opacity-60"
            onClick={() => handleScheduledCheckIn(schedule)}
            disabled={!!schedule.check_in || checkInMutation.isPending}
          >
            <div className="flex-1 text-left min-w-0">
              <p className="text-lg font-semibold truncate">{schedule.volunteer_name}</p>
              {schedule.team_name && (
                <Badge variant="secondary" className="mt-1 text-xs">
                  {schedule.team_name}
                </Badge>
              )}
            </div>
            {schedule.check_in ? (
              <Badge className="bg-green-500 hover:bg-green-500 text-base px-3 py-1.5 shrink-0 ml-3">
                <Check className="h-4 w-4 mr-1" />
                {format(new Date(schedule.check_in.checked_in_at), 'HH:mm', { locale: ptBR })}
              </Badge>
            ) : (
              <div className="shrink-0 ml-3 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-base font-medium">
                Check-in
              </div>
            )}
          </button>
        ))}

        {/* Unscheduled divider */}
        {unscheduledVolunteers.length > 0 && filtered.length > 0 && (
          <div className="flex items-center gap-2 py-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-sm text-amber-600 flex items-center gap-1 font-medium">
              <AlertTriangle className="h-4 w-4" />
              Sem escala
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
        )}

        {/* Unscheduled volunteers */}
        {unscheduledVolunteers.map((vol, idx) => (
          <button
            key={`unsched-${idx}`}
            className="w-full flex items-center justify-between p-4 rounded-xl border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800 hover:bg-amber-100/50 transition-colors active:scale-[0.98]"
            onClick={() => setUnscheduledConfirm({
              volunteerId: vol.id,
              planningCenterId: vol.pcId || undefined,
              volunteerName: vol.name,
            })}
            disabled={checkInMutation.isPending}
          >
            <div className="flex-1 text-left min-w-0">
              <p className="text-lg font-semibold truncate">{vol.name}</p>
              <Badge variant="outline" className="mt-1 text-xs border-amber-500 text-amber-600">
                Sem escala
              </Badge>
            </div>
            <div className="shrink-0 ml-3 border border-amber-500 text-amber-600 px-5 py-2.5 rounded-lg text-base font-medium">
              Check-in
            </div>
          </button>
        ))}

        {searchTerm && filtered.length === 0 && unscheduledVolunteers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg">Nenhum voluntário encontrado</p>
            <p className="text-sm mt-1">Tente buscar com outro nome</p>
          </div>
        )}

        {!searchTerm && filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg">Digite seu nome para fazer check-in</p>
          </div>
        )}
      </div>

      {/* Unscheduled confirmation dialog */}
      <AlertDialog open={!!unscheduledConfirm} onOpenChange={() => setUnscheduledConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Voluntário sem escala
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              <strong>{unscheduledConfirm?.volunteerName}</strong> não está escalado(a) para este culto.
              Deseja registrar o check-in mesmo assim?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12 text-base">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnscheduledConfirm}
              className="h-12 text-base bg-amber-500 hover:bg-amber-600"
            >
              Confirmar Check-in
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success overlay */}
      {successData && (
        <SuccessOverlay
          volunteerName={successData.volunteerName}
          teamName={successData.teamName}
          positionName={successData.positionName}
          onDismiss={() => setSuccessData(null)}
          duration={3500}
        />
      )}
    </div>
  );
}
