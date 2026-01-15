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
import { AlertTriangle } from 'lucide-react';

interface UnscheduledCheckinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  volunteerName: string;
  onConfirm: () => void;
  isProcessing: boolean;
}

export function UnscheduledCheckinDialog({
  open,
  onOpenChange,
  volunteerName,
  onConfirm,
  isProcessing,
}: UnscheduledCheckinDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Voluntário sem Escala
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="font-semibold text-foreground">{volunteerName}</span>
            <span> não está escalado para o culto de hoje.</span>
            <br />
            <span>Deseja registrar o check-in mesmo assim?</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm} 
            disabled={isProcessing}
            className="bg-amber-500 hover:bg-amber-600"
          >
            {isProcessing ? 'Registrando...' : 'Sim, registrar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
