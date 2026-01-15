import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Check } from 'lucide-react';
import type { ScheduleWithDetails } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ManualCheckinProps {
  schedules: ScheduleWithDetails[];
  onCheckIn: (scheduleId: string) => void;
  isProcessing: boolean;
}

export function ManualCheckin({ schedules, onCheckIn, isProcessing }: ManualCheckinProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSchedules = schedules.filter(schedule =>
    schedule.volunteer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    schedule.team_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    schedule.position_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Check-in Manual</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar voluntário..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {filteredSchedules.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum voluntário encontrado
            </p>
          ) : (
            filteredSchedules.map((schedule) => (
              <div
                key={schedule.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{schedule.volunteer_name}</p>
                  <div className="flex gap-1 flex-wrap mt-1">
                    {schedule.team_name && (
                      <Badge variant="secondary" className="text-xs">
                        {schedule.team_name}
                      </Badge>
                    )}
                  </div>
                </div>
                
                {schedule.check_in ? (
                  <Badge className="bg-green-500 hover:bg-green-500 shrink-0 ml-2">
                    <Check className="h-3 w-3 mr-1" />
                    {format(new Date(schedule.check_in.checked_in_at), 'HH:mm', { locale: ptBR })}
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => onCheckIn(schedule.id)}
                    disabled={isProcessing}
                    className="shrink-0 ml-2"
                  >
                    Check-in
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
