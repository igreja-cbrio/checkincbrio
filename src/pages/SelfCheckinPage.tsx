import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Check, AlertTriangle, Loader2, Church } from 'lucide-react';
import { SuccessOverlay } from '@/components/checkin/SuccessOverlay';
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

interface Schedule {
  id: string;
  volunteer_name: string;
  team_name: string | null;
  position_name: string | null;
  has_checkin: boolean;
}

interface SuccessData {
  volunteerName: string;
  teamName?: string | null;
  positionName?: string | null;
  isUnscheduled?: boolean;
}

function getEdgeFunctionUrl(path: string) {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  return `https://${projectId}.supabase.co/functions/v1/${path}`;
}

export default function SelfCheckinPage() {
  const [searchParams] = useSearchParams();
  const serviceId = searchParams.get('service');
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!serviceId) {
      setError('Nenhum culto selecionado');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(getEdgeFunctionUrl('self-checkin'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId, action: 'list' }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setServiceName(data.serviceName || '');
      setSchedules(data.schedules || []);
    } catch {
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCheckIn = useCallback(async (schedule: Schedule) => {
    if (schedule.has_checkin || processing) return;
    setProcessing(true);
    try {
      const res = await fetch(getEdgeFunctionUrl('self-checkin'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId, scheduleId: schedule.id }),
      });
      const result = await res.json();

      if (result.error) {
        if (result.alreadyCheckedIn) {
          toast.info('Check-in já foi realizado');
          fetchData();
        } else {
          toast.error(result.error);
        }
        return;
      }

      setSuccessData({
        volunteerName: result.volunteerName,
        teamName: result.teamName,
        positionName: result.positionName,
      });
      setSearchTerm('');
      fetchData();
    } catch {
      toast.error('Erro ao fazer check-in');
    } finally {
      setProcessing(false);
    }
  }, [serviceId, processing, fetchData]);

  const filtered = schedules.filter(s =>
    s.volunteer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.team_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <AlertTriangle className="h-16 w-16 text-amber-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">{error}</h1>
        <p className="text-muted-foreground">Verifique o QR Code e tente novamente</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="p-4 border-b bg-card text-center">
        <div className="flex items-center justify-center gap-2">
          <Church className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">Check-in</h1>
        </div>
        {serviceName && (
          <p className="text-sm text-muted-foreground mt-1">{serviceName}</p>
        )}
      </header>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar seu nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 text-base rounded-xl"
            autoFocus
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {filtered.map((schedule) => (
          <button
            key={schedule.id}
            className="w-full flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors active:scale-[0.98] disabled:opacity-60"
            onClick={() => handleCheckIn(schedule)}
            disabled={schedule.has_checkin || processing}
          >
            <div className="flex-1 text-left min-w-0">
              <p className="text-base font-semibold truncate">{schedule.volunteer_name}</p>
              {schedule.team_name && (
                <Badge variant="secondary" className="mt-1 text-xs">
                  {schedule.team_name}
                </Badge>
              )}
            </div>
            {schedule.has_checkin ? (
              <Badge className="bg-green-500 hover:bg-green-500 px-3 py-1 shrink-0 ml-3">
                <Check className="h-4 w-4 mr-1" />
                Presente
              </Badge>
            ) : (
              <div className="shrink-0 ml-3 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium">
                Check-in
              </div>
            )}
          </button>
        ))}

        {searchTerm && filtered.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhum voluntário encontrado</p>
            <p className="text-sm mt-1">Verifique o nome digitado</p>
          </div>
        )}

        {!searchTerm && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>Digite seu nome para fazer check-in</p>
          </div>
        )}
      </div>

      {/* Success overlay */}
      {successData && (
        <SuccessOverlay
          volunteerName={successData.volunteerName}
          teamName={successData.teamName}
          positionName={successData.positionName}
          onDismiss={() => setSuccessData(null)}
          duration={3000}
        />
      )}
    </div>
  );
}
