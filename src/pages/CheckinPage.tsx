import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { QrScanner } from '@/components/checkin/QrScanner';
import { ManualCheckin } from '@/components/checkin/ManualCheckin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTodaysServices } from '@/hooks/useServices';
import { useServiceSchedules, useCheckIn, useScheduleByQrCode } from '@/hooks/useSchedules';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, CheckCircle2 } from 'lucide-react';

export default function CheckinPage() {
  const { isLeader } = useAuth();
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  
  const { data: todaysServices, isLoading: loadingServices } = useTodaysServices();
  const { data: schedules, isLoading: loadingSchedules } = useServiceSchedules(selectedServiceId);
  const checkInMutation = useCheckIn();
  const qrCodeMutation = useScheduleByQrCode();

  if (!isLeader) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleQrScan = async (qrCode: string) => {
    if (qrCodeMutation.isPending || checkInMutation.isPending) return;

    try {
      const result = await qrCodeMutation.mutateAsync(qrCode);
      await checkInMutation.mutateAsync({
        scheduleId: result.schedule.id,
        method: 'qr_code',
      });
      toast.success(`Check-in: ${result.schedule.volunteer_name}`);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao processar QR Code');
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

  const checkedInCount = schedules?.filter(s => s.check_in).length || 0;
  const totalCount = schedules?.length || 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Check-in</h1>
        <p className="text-sm text-muted-foreground">Registre a presença</p>
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
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>{checkedInCount}/{totalCount} check-ins</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Check-in Methods */}
      {selectedServiceId && (
        <Tabs defaultValue="qr" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="qr">QR Code</TabsTrigger>
            <TabsTrigger value="manual">Manual</TabsTrigger>
          </TabsList>
          
          <TabsContent value="qr" className="mt-3">
            <QrScanner 
              onScan={handleQrScan} 
              isProcessing={qrCodeMutation.isPending || checkInMutation.isPending}
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
                isProcessing={checkInMutation.isPending}
              />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
