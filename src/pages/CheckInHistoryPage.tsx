import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMyCheckInHistory, useVolunteerCheckInHistory, useVolunteerProfile, useVolunteerHistoryByName } from '@/hooks/useCheckInHistory';
import { CheckInHistoryList } from '@/components/history/CheckInHistoryList';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Calendar, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function CheckInHistoryPage() {
  const { volunteerId, volunteerName } = useParams();
  const { user, isLeader } = useAuth();
  const [period, setPeriod] = useState('30days');

  // Decode volunteer name if present
  const decodedVolunteerName = volunteerName ? decodeURIComponent(volunteerName) : undefined;

  // Determine which user's history to show
  const targetUserId = volunteerId || user?.id;
  const isViewingOther = (volunteerId && volunteerId !== user?.id) || !!volunteerName;

  // Fetch volunteer profile if viewing another user's history (by ID)
  const { data: volunteerProfile } = useVolunteerProfile(
    volunteerId && volunteerId !== user?.id ? volunteerId : undefined
  );

  // Use appropriate hook based on context
  const { data: checkInsByName, isLoading: loadingByName } = useVolunteerHistoryByName(
    decodedVolunteerName,
    period
  );

  const { data: checkInsById, isLoading: loadingById } = isViewingOther && isLeader && volunteerId
    ? useVolunteerCheckInHistory(volunteerId, period)
    : useMyCheckInHistory(decodedVolunteerName ? undefined : targetUserId, period);

  // Select the right data based on mode
  const checkIns = decodedVolunteerName ? checkInsByName : checkInsById;
  const isLoading = decodedVolunteerName ? loadingByName : loadingById;

  // Calculate summary stats
  const totalCheckIns = checkIns?.length || 0;
  const scheduledCheckIns = checkIns?.filter(c => !c.is_unscheduled).length || 0;
  const unscheduledCheckIns = checkIns?.filter(c => c.is_unscheduled).length || 0;

  const pageTitle = decodedVolunteerName 
    ? `Histórico de ${decodedVolunteerName}`
    : isViewingOther && volunteerProfile
      ? `Histórico de ${volunteerProfile.full_name}`
      : 'Meu Histórico';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {isViewingOther && (
            <Link to="/reports">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          )}
          <div>
            <h1 className="text-xl font-bold">{pageTitle}</h1>
            <p className="text-sm text-muted-foreground">
              Registro de presenças
            </p>
          </div>
        </div>

        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">7 dias</SelectItem>
            <SelectItem value="30days">30 dias</SelectItem>
            <SelectItem value="90days">90 dias</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-4 text-center">
            <Calendar className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{totalCheckIns}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <CheckCircle2 className="h-5 w-5 mx-auto text-green-600 mb-1" />
            <p className="text-2xl font-bold">{scheduledCheckIns}</p>
            <p className="text-xs text-muted-foreground">Escalado</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto text-amber-500 mb-1" />
            <p className="text-2xl font-bold">{unscheduledCheckIns}</p>
            <p className="text-xs text-muted-foreground">Sem escala</p>
          </CardContent>
        </Card>
      </div>

      {/* Check-in List */}
      <CheckInHistoryList checkIns={checkIns} isLoading={isLoading} />
    </div>
  );
}
