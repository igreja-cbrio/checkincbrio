import { useState, useCallback, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AutoFaceScanner, FaceMatchResult } from '@/components/checkin/AutoFaceScanner';
import { SuccessOverlay } from '@/components/checkin/SuccessOverlay';
import { KioskNameCheckin } from '@/components/checkin/KioskNameCheckin';
import { KioskQrDisplay } from '@/components/checkin/KioskQrDisplay';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTodaysServices } from '@/hooks/useServices';
import { useServiceSchedules, useCheckIn, useUnscheduledCheckIns } from '@/hooks/useSchedules';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, CheckCircle2, AlertTriangle, Maximize2, Minimize2, Users, ClipboardList, Camera, QrCode } from 'lucide-react';

interface SuccessData {
  volunteerName: string;
  avatarUrl?: string | null;
  teamName?: string | null;
  positionName?: string | null;
}

export default function FaceCheckinKioskPage() {
  const navigate = useNavigate();
  const { isLeader } = useAuth();
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [recentCheckIns, setRecentCheckIns] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('list');

  const { data: todaysServices, isLoading: loadingServices } = useTodaysServices();
  const { data: schedules } = useServiceSchedules(selectedServiceId);
  const { data: unscheduledCheckIns } = useUnscheduledCheckIns(selectedServiceId);
  const checkInMutation = useCheckIn();

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  const handleFacialMatch = useCallback(async (result: FaceMatchResult) => {
    if (!selectedServiceId) return;

    if (recentCheckIns.includes(result.volunteerName)) {
      toast.info(`${result.volunteerName} já fez check-in recentemente`);
      return;
    }

    try {
      const volunteerSchedule = schedules?.find(s =>
        s.volunteer_id === result.volunteerId ||
        s.planning_center_person_id === result.planningCenterId
      );

      await checkInMutation.mutateAsync({
        volunteerId: result.volunteerId || undefined,
        scheduleId: volunteerSchedule?.id,
        serviceId: selectedServiceId,
        method: 'facial',
        isUnscheduled: !volunteerSchedule,
      });

      setRecentCheckIns(prev => [...prev, result.volunteerName]);
      setTimeout(() => {
        setRecentCheckIns(prev => prev.filter(n => n !== result.volunteerName));
      }, 60000);

      setSuccessData({
        volunteerName: result.volunteerName,
        avatarUrl: result.avatarUrl,
        teamName: volunteerSchedule?.team_name,
        positionName: volunteerSchedule?.position_name,
      });
    } catch (error: any) {
      if (error.message?.includes('duplicate') || error.message?.includes('já fez check-in')) {
        toast.info(`${result.volunteerName} já fez check-in neste culto`);
      } else {
        toast.error('Erro ao fazer check-in');
      }
    }
  }, [selectedServiceId, checkInMutation, schedules, recentCheckIns]);

  if (!isLeader) {
    return <Navigate to="/dashboard" replace />;
  }

  const checkedInCount = schedules?.filter(s => s.check_in).length || 0;
  const totalCount = schedules?.length || 0;
  const unscheduledCount = unscheduledCheckIns?.length || 0;
  const selectedService = todaysServices?.find(s => s.id === selectedServiceId);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-3 border-b bg-card">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/checkin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Modo Totem</h1>
            <p className="text-xs text-muted-foreground">Check-in self-service</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-64">
            {loadingServices ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : todaysServices && todaysServices.length > 0 ? (
              <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o culto" />
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
          </div>
          <Button variant="outline" size="icon" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      {/* Stats bar */}
      {selectedServiceId && (
        <div className="flex items-center justify-center gap-6 py-2 bg-muted/50 border-b">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{selectedService?.name}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>{checkedInCount}/{totalCount} presentes</span>
          </div>
          {unscheduledCount > 0 && (
            <Badge variant="outline" className="border-amber-500 text-amber-600">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {unscheduledCount} sem escala
            </Badge>
          )}
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {!selectedServiceId ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
            <Users className="h-16 w-16 text-muted-foreground/50" />
            <p className="text-xl text-muted-foreground">Selecione um culto para iniciar</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <div className="px-4 pt-3">
              <TabsList className="w-full h-14 grid grid-cols-3 rounded-xl">
                <TabsTrigger value="list" className="text-base gap-2 h-12 rounded-lg data-[state=active]:shadow-md">
                  <ClipboardList className="h-5 w-5" />
                  Lista
                </TabsTrigger>
                <TabsTrigger value="facial" className="text-base gap-2 h-12 rounded-lg data-[state=active]:shadow-md">
                  <Camera className="h-5 w-5" />
                  Facial
                </TabsTrigger>
                <TabsTrigger value="qrcode" className="text-base gap-2 h-12 rounded-lg data-[state=active]:shadow-md">
                  <QrCode className="h-5 w-5" />
                  QR Code
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="list" className="flex-1 overflow-hidden mt-0">
              <KioskNameCheckin serviceId={selectedServiceId} />
            </TabsContent>

            <TabsContent value="facial" className="flex-1 overflow-hidden mt-0">
              <AutoFaceScanner
                onMatch={handleFacialMatch}
                onNotFound={() => {}}
                isProcessing={checkInMutation.isPending}
                cooldownMs={4000}
              />
            </TabsContent>

            <TabsContent value="qrcode" className="flex-1 overflow-hidden mt-0">
              <KioskQrDisplay serviceId={selectedServiceId} />
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* Success overlay (for facial mode) */}
      {successData && (
        <SuccessOverlay
          volunteerName={successData.volunteerName}
          avatarUrl={successData.avatarUrl}
          teamName={successData.teamName}
          positionName={successData.positionName}
          onDismiss={() => setSuccessData(null)}
          duration={3500}
        />
      )}
    </div>
  );
}
