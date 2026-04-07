import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { GraduationCap, Printer, Loader2, Eye, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { printLabel } from '@/components/checkin/LabelPrint';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

interface TrainingRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId: string;
}

function LabelPreview({ volunteerName, teamName, date }: { volunteerName: string; teamName: string; date: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs text-muted-foreground">Pré-visualização da etiqueta (62mm × 29mm)</p>
      <div
        className="border-2 border-dashed border-muted-foreground/30 rounded-md bg-white text-black flex flex-col items-center justify-center overflow-hidden"
        style={{ width: '248px', height: '116px', padding: '8px 12px' }}
      >
        <span style={{ fontSize: '7px', fontWeight: 'bold', letterSpacing: '1px', color: '#333' }}>
          ✝ CBRIO
        </span>
        <span
          style={{
            fontSize: '13px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            marginTop: '4px',
            textAlign: 'center',
            lineHeight: 1.1,
            maxWidth: '220px',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          {volunteerName || 'NOME DO VOLUNTÁRIO'}
        </span>
        <span
          style={{
            marginTop: '4px',
            fontSize: '7px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            border: '1px solid #000',
            borderRadius: '2px',
            padding: '1px 6px',
          }}
        >
          EM TREINAMENTO
        </span>
        <span style={{ fontSize: '7px', color: '#555', marginTop: '3px' }}>
          {teamName || 'Equipe'} • {date}
        </span>
      </div>
    </div>
  );
}

export function TrainingRegistrationDialog({
  open,
  onOpenChange,
  serviceId,
}: TrainingRegistrationDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [phone, setPhone] = useState('');
  const [shouldPrint, setShouldPrint] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const todayFormatted = format(new Date(), 'dd/MM/yyyy');

  const handleSubmit = async () => {
    if (!name.trim() || !teamName.trim()) {
      toast.error('Preencha o nome e a área/equipe');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('training_checkins').insert({
        service_id: serviceId,
        volunteer_name: name.trim(),
        team_name: teamName.trim(),
        phone: phone.trim() || null,
        registered_by: user?.id,
      });

      if (error) throw error;

      toast.success(`Treinamento registrado: ${name.trim()}`);

      if (shouldPrint) {
        printLabel({
          volunteerName: name.trim(),
          teamName: teamName.trim(),
          date: todayFormatted,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['training-checkins'] });
      setName('');
      setTeamName('');
      setPhone('');
      setShowPreview(false);
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao registrar treinamento');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            {showPreview ? 'Pré-visualização' : 'Registrar Treinamento'}
          </DialogTitle>
          {!showPreview && (
            <DialogDescription>
              Registre um voluntário novo ou em treinamento e imprima a etiqueta de identificação.
            </DialogDescription>
          )}
        </DialogHeader>

        {showPreview ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <LabelPreview volunteerName={name} teamName={teamName} date={todayFormatted} />
            <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar ao formulário
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="trainee-name">Nome completo *</Label>
              <Input
                id="trainee-name"
                placeholder="Ex: João da Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trainee-team">Área / Equipe *</Label>
              <Input
                id="trainee-team"
                placeholder="Ex: Worship, Mídia, Recepção"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trainee-phone">Telefone</Label>
              <Input
                id="trainee-phone"
                placeholder="Ex: (21) 99999-9999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={20}
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="print-training-label"
                  checked={shouldPrint}
                  onCheckedChange={(checked) => setShouldPrint(checked === true)}
                />
                <label
                  htmlFor="print-training-label"
                  className="flex items-center gap-1.5 text-sm font-medium cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir etiqueta
                </label>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    printLabel({
                      volunteerName: 'TESTE IMPRESSÃO',
                      teamName: 'Equipe Teste',
                      date: todayFormatted,
                    });
                    toast.info('Impressão de teste enviada');
                  }}
                >
                  <Printer className="h-4 w-4 mr-1" />
                  Teste
                </Button>
                {name.trim() && (
                  <Button variant="ghost" size="sm" onClick={() => setShowPreview(true)}>
                    <Eye className="h-4 w-4 mr-1" />
                    Ver etiqueta
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { setShowPreview(false); onOpenChange(false); }} disabled={isSubmitting}>
            Cancelar
          </Button>
          {!showPreview && (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <GraduationCap className="h-4 w-4 mr-2" />
              )}
              {isSubmitting ? 'Registrando...' : 'Registrar'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}