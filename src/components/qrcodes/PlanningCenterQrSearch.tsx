import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { PlanningCenterSearch } from '@/components/auth/PlanningCenterSearch';
import { useCreateVolunteerQrCode, VolunteerWithQrCode } from '@/hooks/useVolunteersQrCodes';
import { PlanningCenterPerson } from '@/hooks/usePlanningCenterSearch';
import { Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PlanningCenterQrSearchProps {
  onVolunteerCreated: (volunteer: VolunteerWithQrCode) => void;
}

export function PlanningCenterQrSearch({ onVolunteerCreated }: PlanningCenterQrSearchProps) {
  const [open, setOpen] = useState(false);
  const createQrCode = useCreateVolunteerQrCode();

  const handleSelect = async (person: PlanningCenterPerson) => {
    try {
      const volunteer = await createQrCode.mutateAsync({
        planning_center_person_id: person.id,
        volunteer_name: person.full_name,
        avatar_url: person.avatar_url,
      });

      toast.success(`QR Code gerado para ${person.full_name}`);
      setOpen(false);
      
      // Transform the response to match VolunteerWithQrCode
      const transformedVolunteer: VolunteerWithQrCode = {
        id: volunteer.id,
        full_name: volunteer.volunteer_name,
        email: '',
        planning_center_id: volunteer.planning_center_person_id,
        qr_code: volunteer.qr_code,
        avatar_url: volunteer.avatar_url,
        source: 'volunteer_qrcode',
      };
      
      onVolunteerCreated(transformedVolunteer);
    } catch (error) {
      console.error('Error creating QR code:', error);
      toast.error('Erro ao gerar QR Code');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Buscar no Planning Center</span>
          <span className="sm:hidden">Buscar PC</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Buscar Pessoa no Planning Center</DialogTitle>
          <DialogDescription>
            Busque uma pessoa e gere o QR Code para impressão do crachá.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          {createQrCode.isPending ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Gerando QR Code...</span>
            </div>
          ) : (
            <PlanningCenterSearch
              onSelect={handleSelect}
              placeholder="Digite o nome da pessoa..."
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
