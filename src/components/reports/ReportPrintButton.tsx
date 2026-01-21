import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

interface ReportPrintButtonProps {
  title?: string;
}

export function ReportPrintButton({ title = 'Relatório de Serviço' }: ReportPrintButtonProps) {
  const handlePrint = () => {
    // Set document title for print
    const originalTitle = document.title;
    document.title = title;
    
    window.print();
    
    // Restore original title after print dialog closes
    setTimeout(() => {
      document.title = originalTitle;
    }, 100);
  };

  return (
    <Button variant="outline" size="sm" onClick={handlePrint} className="print:hidden">
      <Printer className="h-4 w-4 mr-2" />
      Imprimir
    </Button>
  );
}
