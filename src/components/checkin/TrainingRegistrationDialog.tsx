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
import { GraduationCap, Printer, Loader2 } from 'lucide-react';
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
          date: format(new Date(), 'dd/MM/yyyy'),
        });
      }

      queryClient.invalidateQueries({ queryKey: ['training-checkins'] });
      setName('');
      setTeamName('');
      setPhone('');
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
            Registrar Treinamento
          </DialogTitle>
          <DialogDescription>
            Registre um voluntário novo ou em treinamento e imprima a etiqueta de identificação.
          </DialogDescription>
        </DialogHeader>

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

          <div className="flex items-center gap-2 pt-1">
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
              Imprimir etiqueta de identificação
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <GraduationCap className="h-4 w-4 mr-2" />
            )}
            {isSubmitting ? 'Registrando...' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
