import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ServiceReport } from '@/hooks/useReports';

interface ServiceTableProps {
  data: ServiceReport[];
}

export function ServiceTable({ data }: ServiceTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Relatório por Culto</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Culto</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-center">Escalados</TableHead>
              <TableHead className="text-center">Check-ins</TableHead>
              <TableHead className="text-center">Taxa</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((service, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{service.service_name}</TableCell>
                <TableCell>
                  {format(new Date(service.scheduled_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </TableCell>
                <TableCell className="text-center">{service.total_scheduled}</TableCell>
                <TableCell className="text-center">{service.total_checked_in}</TableCell>
                <TableCell className="text-center">
                  <Badge 
                    variant={service.attendance_rate >= 80 ? 'default' : service.attendance_rate >= 50 ? 'secondary' : 'destructive'}
                  >
                    {Math.round(service.attendance_rate)}%
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
