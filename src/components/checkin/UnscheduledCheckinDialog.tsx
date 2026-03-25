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
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Printer } from 'lucide-react';

interface UnscheduledCheckinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  volunteerName: string;
  onConfirm: (printLabel: boolean) => void;
  isProcessing: boolean;
  printLabelChecked: boolean;
  onPrintLabelChange: (checked: boolean) => void;
}

export function UnscheduledCheckinDialog({
  open,
  onOpenChange,
  volunteerName,
  onConfirm,
  isProcessing,
  printLabelChecked,
  onPrintLabelChange,
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

        <div className="flex items-center gap-2 py-2">
          <Checkbox
            id="print-label"
            checked={printLabelChecked}
            onCheckedChange={(checked) => onPrintLabelChange(checked === true)}
          />
          <label
            htmlFor="print-label"
            className="flex items-center gap-1.5 text-sm font-medium cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            Imprimir etiqueta de identificação
          </label>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => onConfirm(printLabelChecked)} 
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
