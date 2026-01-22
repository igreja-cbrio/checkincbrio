import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { QrScanner } from '@/components/checkin/QrScanner';
import { FaceScanner } from '@/components/checkin/FaceScanner';
import { ManualCheckin, UnscheduledCheckInParams } from '@/components/checkin/ManualCheckin';
import { UnscheduledCheckinDialog } from '@/components/checkin/UnscheduledCheckinDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTodaysServices } from '@/hooks/useServices';
import { useServiceSchedules, useCheckIn, useScheduleByQrCode, useUnscheduledCheckIns, QrCodeResult } from '@/hooks/useSchedules';
import { useSyncPlanningCenter } from '@/hooks/useSyncPlanningCenter';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, CheckCircle2, AlertTriangle, RefreshCw, Loader2, Scan } from 'lucide-react';

export default function CheckinPage() {
  const { isLeader } = useAuth();
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [unscheduledDialog, setUnscheduledDialog] = useState<{
    open: boolean;
    result: QrCodeResult | null;
  }>({ open: false, result: null });
  
  const { data: todaysServices, isLoading: loadingServices } = useTodaysServices();
  const { data: schedules, isLoading: loadingSchedules } = useServiceSchedules(selectedServiceId);
  const { data: unscheduledCheckIns } = useUnscheduledCheckIns(selectedServiceId);
  const checkInMutation = useCheckIn();
  const qrCodeMutation = useScheduleByQrCode();
  const syncMutation = useSyncPlanningCenter();

  if (!isLeader) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSync = async () => {
    try {
      const result = await syncMutation.mutateAsync();
      const avatarMsg = result.avatarsImported ? `, ${result.avatarsImported} fotos` : '';
      toast.success(`Sincronizado! ${result.services} cultos, ${result.newSchedules} escalas${avatarMsg}.`);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao sincronizar');
    }
  };

  const handleQrScan = async (qrCode: string) => {
    if (qrCodeMutation.isPending || checkInMutation.isPending) return;

    try {
      const result = await qrCodeMutation.mutateAsync(qrCode);
      
      if (result.isUnscheduled) {
        // Show confirmation dialog for unscheduled check-in
        setUnscheduledDialog({ open: true, result });
      } else {
        // Normal check-in flow
        await checkInMutation.mutateAsync({
          scheduleId: result.schedule.id,
          method: 'qr_code',
        });
        toast.success(`Check-in: ${result.volunteerName}`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao processar QR Code');
    }
  };

  const handleConfirmUnscheduledCheckIn = async () => {
    if (!unscheduledDialog.result || !selectedServiceId) return;

    try {
      // For volunteer_qrcode entries, volunteerId will be null
      const volunteerId = unscheduledDialog.result.profile.type === 'profile' 
        ? unscheduledDialog.result.profile.id 
        : null;

      await checkInMutation.mutateAsync({
        volunteerId: volunteerId,
        serviceId: selectedServiceId,
        method: 'qr_code',
        isUnscheduled: true,
      });
      toast.warning(`Check-in (sem escala): ${unscheduledDialog.result.volunteerName}`, {
        icon: <AlertTriangle className="h-4 w-4" />,
      });
      setUnscheduledDialog({ open: false, result: null });
    } catch (error) {
      toast.error('Erro ao fazer check-in');
    }
  };

  const handleManualCheckIn = async (scheduleId: string) => {
    try {
      await checkInMutation.mutateAsync({
        scheduleId,
        method: 'manual',
      });
      toast.success('Check-in realizado!');
    } catch (error) {
      toast.error('Erro ao fazer check-in');
    }
  };

  const handleUnscheduledManualCheckIn = async (params: UnscheduledCheckInParams) => {
    if (!selectedServiceId) return;

    try {
      await checkInMutation.mutateAsync({
        volunteerId: params.volunteerId || undefined,
        serviceId: selectedServiceId,
        method: 'manual',
        isUnscheduled: true,
      });
      toast.warning(`Check-in (sem escala): ${params.volunteerName}`, {
        icon: <AlertTriangle className="h-4 w-4" />,
      });
    } catch (error) {
      toast.error('Erro ao fazer check-in');
    }
  };

  const checkedInCount = schedules?.filter(s => s.check_in).length || 0;
  const totalCount = schedules?.length || 0;
  const unscheduledCount = unscheduledCheckIns?.length || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Check-in</h1>
          <p className="text-sm text-muted-foreground">Registre a presença</p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleSync}
          disabled={syncMutation.isPending}
        >
          {syncMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-2">Sincronizar</span>
        </Button>
      </div>

      {/* Service Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Selecione o Culto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingServices ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : todaysServices && todaysServices.length > 0 ? (
            <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um culto" />
              </SelectTrigger>
              <SelectContent>
                {todaysServices.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name} - {format(new Date(service.scheduled_at), 'HH:mm', { locale: ptBR })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum culto hoje</p>
          )}

          {selectedServiceId && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>{checkedInCount}/{totalCount} escalados</span>
              </div>
              {unscheduledCount > 0 && (
                <Badge variant="outline" className="border-amber-500 text-amber-600">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {unscheduledCount} sem escala
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Check-in Methods */}
      {selectedServiceId && (
        <Tabs defaultValue="qr" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="qr">QR Code</TabsTrigger>
            <TabsTrigger value="facial" className="flex items-center gap-1">
              <Scan className="h-3.5 w-3.5" />
              Facial
            </TabsTrigger>
            <TabsTrigger value="manual">Manual</TabsTrigger>
          </TabsList>
          
          <TabsContent value="qr" className="mt-3">
            <QrScanner 
              onScan={handleQrScan} 
              isProcessing={qrCodeMutation.isPending || checkInMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="facial" className="mt-3">
            <FaceScanner
              onCheckIn={async (result) => {
                try {
                  await checkInMutation.mutateAsync({
                    volunteerId: result.volunteerId || undefined,
                    serviceId: selectedServiceId,
                    method: 'facial',
                    isUnscheduled: true,
                  });
                  toast.success(`Check-in facial: ${result.volunteerName}`);
                } catch (error) {
                  toast.error('Erro ao fazer check-in');
                }
              }}
              isProcessing={checkInMutation.isPending}
            />
          </TabsContent>
          
          <TabsContent value="manual" className="mt-3">
            {loadingSchedules ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                </CardContent>
              </Card>
            ) : (
              <ManualCheckin
                schedules={schedules || []}
                onCheckIn={handleManualCheckIn}
                onUnscheduledCheckIn={handleUnscheduledManualCheckIn}
                isProcessing={checkInMutation.isPending}
                serviceId={selectedServiceId}
              />
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Unscheduled Check-in Confirmation Dialog */}
      <UnscheduledCheckinDialog
        open={unscheduledDialog.open}
        onOpenChange={(open) => setUnscheduledDialog({ open, result: open ? unscheduledDialog.result : null })}
        volunteerName={unscheduledDialog.result?.volunteerName || ''}
        onConfirm={handleConfirmUnscheduledCheckIn}
        isProcessing={checkInMutation.isPending}
      />
    </div>
  );
}
