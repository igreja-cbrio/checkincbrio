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
import { Slider } from '@/components/ui/slider';
import { GraduationCap, Printer, Loader2, Eye, ArrowLeft, Minus, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { printLabel } from '@/components/checkin/LabelPrint';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

interface TrainingRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId?: string;
}

function LabelPreview({
  volunteerName,
  teamName,
  date,
  fontSize,
}: {
  volunteerName: string;
  teamName: string;
  date: string;
  fontSize: number;
}) {
  // Scale: 90.3mm ≈ 341px at 96dpi, 29mm ≈ 110px — we use a ~3.78 factor
  const labelW = 341;
  const labelH = 110;

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs text-muted-foreground">
        Pré-visualização da etiqueta (90,3mm × 29mm) — Fonte: {fontSize}pt
      </p>
      <div
        className="border-2 border-dashed border-muted-foreground/30 rounded-md bg-white text-black flex flex-row items-center overflow-hidden"
        style={{
          width: `${labelW}px`,
          height: `${labelH}px`,
          padding: '8px 15px',
        }}
      >
        {/* Left: cross + church */}
        <div
          className="flex flex-col items-center justify-center shrink-0"
          style={{ minWidth: '50px', marginRight: '10px' }}
        >
          <span style={{ fontSize: '16px', lineHeight: 1 }}>✝</span>
          <span
            style={{
              fontSize: '6px',
              fontWeight: 'bold',
              letterSpacing: '0.5px',
              color: '#333',
              marginTop: '2px',
            }}
          >
            CBRIO
          </span>
        </div>

        {/* Right: name + badge + info */}
        <div className="flex flex-col justify-center overflow-hidden flex-1">
          <span
            style={{
              fontSize: `${fontSize}px`,
              fontWeight: 'bold',
              textTransform: 'uppercase',
              lineHeight: 1.15,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            }}
          >
            {volunteerName || 'NOME DO VOLUNTÁRIO'}
          </span>
          <span
            style={{
              marginTop: '3px',
              fontSize: '6px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              border: '0.5px solid #000',
              borderRadius: '1px',
              padding: '1px 6px',
              display: 'inline-block',
              width: 'fit-content',
            }}
          >
            EM TREINAMENTO
          </span>
          <span style={{ fontSize: '6.5px', color: '#555', marginTop: '2px' }}>
            {teamName || 'Equipe'} • {date}
          </span>
        </div>
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
  const [fontSize, setFontSize] = useState(14);

  const todayFormatted = format(new Date(), 'dd/MM/yyyy');

  const handleSubmit = async () => {
    if (!name.trim() || !teamName.trim()) {
      toast.error('Preencha o nome e a área/equipe');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('training_checkins').insert({
        service_id: serviceId || null,
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
          fontSize,
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
            <LabelPreview
              volunteerName={name}
              teamName={teamName}
              date={todayFormatted}
              fontSize={fontSize}
            />

            {/* Font size control */}
            <div className="w-full max-w-xs space-y-2">
              <Label className="text-sm">Tamanho da fonte do nome</Label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setFontSize((prev) => Math.max(8, prev - 1))}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Slider
                  value={[fontSize]}
                  onValueChange={([v]) => setFontSize(v)}
                  min={8}
                  max={24}
                  step={1}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setFontSize((prev) => Math.min(24, prev + 1))}
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <span className="text-sm font-mono w-8 text-center">{fontSize}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  printLabel({
                    volunteerName: name.trim() || 'TESTE IMPRESSÃO',
                    teamName: teamName.trim() || 'Equipe Teste',
                    date: todayFormatted,
                    fontSize,
                  });
                  toast.info('Impressão de teste enviada');
                }}
              >
                <Printer className="h-4 w-4 mr-1" />
                Imprimir teste
              </Button>
            </div>
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
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(true)}>
                <Eye className="h-4 w-4 mr-1" />
                Ver etiqueta
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowPreview(false);
              onOpenChange(false);
            }}
            disabled={isSubmitting}
          >
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
