import { format, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface PeriodOption {
  value: string;
  label: string;
}

interface PeriodFilterProps {
  period: string;
  onPeriodChange: (period: string) => void;
  customRange: DateRange;
  onCustomRangeChange: (range: DateRange) => void;
  periodOptions: PeriodOption[];
}

export function PeriodFilter({
  period,
  onPeriodChange,
  customRange,
  onCustomRangeChange,
  periodOptions,
}: PeriodFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={period} onValueChange={onPeriodChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {periodOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>

      {period === 'custom' && (
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-[130px] justify-start text-left font-normal',
                  !customRange.startDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customRange.startDate
                  ? format(customRange.startDate, 'dd/MM/yyyy', { locale: ptBR })
                  : 'Início'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customRange.startDate}
                onSelect={(date) =>
                  date &&
                  onCustomRangeChange({
                    ...customRange,
                    startDate: date,
                  })
                }
                disabled={(date) => date > customRange.endDate}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <span className="text-sm text-muted-foreground">até</span>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-[130px] justify-start text-left font-normal',
                  !customRange.endDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customRange.endDate
                  ? format(customRange.endDate, 'dd/MM/yyyy', { locale: ptBR })
                  : 'Fim'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customRange.endDate}
                onSelect={(date) =>
                  date &&
                  onCustomRangeChange({
                    ...customRange,
                    endDate: date,
                  })
                }
                disabled={(date) => date < customRange.startDate}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}
