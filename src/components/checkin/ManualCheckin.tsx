import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Check, UserPlus, AlertTriangle, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import type { ScheduleWithDetails } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

function ConfirmationBadge({ status }: { status: string | null }) {
  if (status === 'confirmed') {
    return (
      <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
        <CheckCircle className="h-3 w-3 mr-1" />
        Confirmou
      </Badge>
    );
  }
  if (status === 'pending') {
    return (
      <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
        <AlertCircle className="h-3 w-3 mr-1" />
        Pendente
      </Badge>
    );
  }
  if (status === 'declined') {
    return (
      <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/30">
        <XCircle className="h-3 w-3 mr-1" />
        Recusou
      </Badge>
    );
  }
  return null;
}

interface ManualCheckinProps {
  schedules: ScheduleWithDetails[];
  onCheckIn: (scheduleId: string) => void;
  onUnscheduledCheckIn: (volunteerId: string, volunteerName: string) => void;
  isProcessing: boolean;
  serviceId: string;
}

interface VolunteerProfile {
  id: string;
  full_name: string;
  planning_center_id: string | null;
}

export function ManualCheckin({ 
  schedules, 
  onCheckIn, 
  onUnscheduledCheckIn,
  isProcessing,
  serviceId,
}: ManualCheckinProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllVolunteers, setShowAllVolunteers] = useState(false);

  // Get all volunteer profiles for unscheduled check-in
  const { data: allVolunteers } = useQuery({
    queryKey: ['profiles', 'volunteers'],
    enabled: showAllVolunteers,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, planning_center_id')
        .order('full_name');
      
      if (error) throw error;
      return data as VolunteerProfile[];
    },
  });

  // Get today's unscheduled check-ins to filter out already checked in
  const { data: todayUnscheduledCheckIns } = useQuery({
    queryKey: ['check-ins', 'unscheduled', 'today', serviceId],
    enabled: showAllVolunteers && !!serviceId,
    queryFn: async () => {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      const { data, error } = await supabase
        .from('check_ins')
        .select('volunteer_id')
        .eq('service_id', serviceId)
        .eq('is_unscheduled', true)
        .gte('checked_in_at', startOfDay)
        .lt('checked_in_at', endOfDay);
      
      if (error) throw error;
      return data.map(c => c.volunteer_id);
    },
  });

  const filteredSchedules = schedules.filter(schedule =>
    schedule.volunteer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    schedule.team_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    schedule.position_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get scheduled volunteer IDs to exclude from unscheduled list
  const scheduledVolunteerIds = new Set(schedules.map(s => s.volunteer_id).filter(Boolean));
  const alreadyCheckedInIds = new Set(todayUnscheduledCheckIns || []);

  const unscheduledVolunteers = allVolunteers?.filter(v => 
    !scheduledVolunteerIds.has(v.id) && 
    !alreadyCheckedInIds.has(v.id) &&
    v.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Check-in Manual</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar voluntário..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {/* Scheduled volunteers */}
          {filteredSchedules.length === 0 && !showAllVolunteers ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum voluntário encontrado
            </p>
          ) : (
            filteredSchedules.map((schedule) => (
              <div
                key={schedule.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">{schedule.volunteer_name}</p>
                    <ConfirmationBadge status={schedule.confirmation_status} />
                  </div>
                  <div className="flex gap-1 flex-wrap mt-1">
                    {schedule.team_name && (
                      <Badge variant="secondary" className="text-xs">
                        {schedule.team_name}
                      </Badge>
                    )}
                  </div>
                </div>
                
                {schedule.check_in ? (
                  <Badge className="bg-green-500 hover:bg-green-500 shrink-0 ml-2">
                    <Check className="h-3 w-3 mr-1" />
                    {format(new Date(schedule.check_in.checked_in_at), 'HH:mm', { locale: ptBR })}
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => onCheckIn(schedule.id)}
                    disabled={isProcessing}
                    className="shrink-0 ml-2"
                  >
                    Check-in
                  </Button>
                )}
              </div>
            ))
          )}

          {/* Divider for unscheduled section */}
          {showAllVolunteers && unscheduledVolunteers.length > 0 && filteredSchedules.length > 0 && (
            <div className="flex items-center gap-2 py-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                Sem escala
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}

          {/* Unscheduled volunteers */}
          {showAllVolunteers && unscheduledVolunteers.map((volunteer) => (
            <div
              key={volunteer.id}
              className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{volunteer.full_name}</p>
                <Badge variant="outline" className="text-xs border-amber-500 text-amber-600 mt-1">
                  Sem escala
                </Badge>
              </div>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUnscheduledCheckIn(volunteer.id, volunteer.full_name)}
                disabled={isProcessing}
                className="shrink-0 ml-2 border-amber-500 text-amber-600 hover:bg-amber-100"
              >
                Check-in
              </Button>
            </div>
          ))}
        </div>

        {/* Toggle to show unscheduled volunteers */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setShowAllVolunteers(!showAllVolunteers)}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          {showAllVolunteers ? 'Ocultar voluntários sem escala' : 'Mostrar todos os voluntários'}
        </Button>
      </CardContent>
    </Card>
  );
}
