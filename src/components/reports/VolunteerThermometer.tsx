import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { History, Flame, ThermometerSun, Snowflake, AlertTriangle, X } from 'lucide-react';
import { ThermometerSummary, ActivityLevel } from '@/hooks/useVolunteerThermometer';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

interface Props {
  data: ThermometerSummary;
}

type FilterValue = ActivityLevel | 'all';

const levelConfig: Record<ActivityLevel, { label: string; color: string; badgeClass: string; icon: React.ReactNode; ring: string }> = {
  very_active: {
    label: 'Muito Ativo',
    color: 'hsl(217, 91%, 60%)',
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-blue-300 dark:border-blue-700',
    icon: <Flame className="h-5 w-5 text-blue-500" />,
    ring: 'ring-blue-500',
  },
  regular: {
    label: 'Regular',
    color: 'hsl(142, 71%, 45%)',
    badgeClass: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-green-300 dark:border-green-700',
    icon: <ThermometerSun className="h-5 w-5 text-green-500" />,
    ring: 'ring-green-500',
  },
  low: {
    label: 'Pouco Ativo',
    color: 'hsl(45, 93%, 47%)',
    badgeClass: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
    icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    ring: 'ring-yellow-500',
  },
  inactive: {
    label: 'Inativo',
    color: 'hsl(0, 84%, 60%)',
    badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-red-300 dark:border-red-700',
    icon: <Snowflake className="h-5 w-5 text-red-500" />,
    ring: 'ring-red-500',
  },
};

export function VolunteerThermometer({ data }: Props) {
  const [filter, setFilter] = useState<FilterValue>('all');

  const barData = [
    { name: 'Muito Ativo', value: data.very_active, color: levelConfig.very_active.color },
    { name: 'Regular', value: data.regular, color: levelConfig.regular.color },
    { name: 'Pouco Ativo', value: data.low, color: levelConfig.low.color },
    { name: 'Inativo', value: data.inactive, color: levelConfig.inactive.color },
  ];

  const summaryCards: { level: ActivityLevel; count: number }[] = [
    { level: 'very_active', count: data.very_active },
    { level: 'regular', count: data.regular },
    { level: 'low', count: data.low },
    { level: 'inactive', count: data.inactive },
  ];

  if (data.total === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Nenhum dado disponível para o período selecionado</p>
        </CardContent>
      </Card>
    );
  }

  const toggleFilter = (level: ActivityLevel) => {
    setFilter((prev) => (prev === level ? 'all' : level));
  };

  const filteredVolunteers =
    filter === 'all' ? data.volunteers : data.volunteers.filter((v) => v.level === filter);

  const filterLabel = filter === 'all' ? null : levelConfig[filter].label;

  return (
    <div className="space-y-4">
      {/* Summary Cards (clickable) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {summaryCards.map(({ level, count }) => {
          const config = levelConfig[level];
          const isActive = filter === level;
          return (
            <button
              key={level}
              type="button"
              onClick={() => toggleFilter(level)}
              aria-pressed={isActive}
              className={cn(
                'rounded-lg border bg-card text-card-foreground shadow-sm transition-all',
                'hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2',
                isActive && `ring-2 ring-offset-2 ${config.ring}`
              )}
            >
              <div className="py-4 text-center px-2">
                <div className="flex justify-center">{config.icon}</div>
                <p className="text-xl font-bold mt-1">{count}</p>
                <p className="text-xs text-muted-foreground">{config.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Stacked Horizontal Bar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Distribuição</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={60}>
            <BarChart layout="vertical" data={[{ name: 'Todos', ...Object.fromEntries(barData.map(b => [b.name, b.value])) }]}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" hide />
              <Tooltip
                formatter={(value: number, name: string) => [`${value} voluntários`, name]}
              />
              {barData.map((entry) => (
                <Bar key={entry.name} dataKey={entry.name} stackId="a" fill={entry.color} radius={0} />
              ))}
            </BarChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3 justify-center">
            {barData.map(entry => (
              <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: entry.color }} />
                <span className="text-muted-foreground">{entry.name}: {entry.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Volunteer List */}
      <Card>
        <CardHeader className="pb-3 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base">
              Voluntários ({filteredVolunteers.length}
              {filter !== 'all' && ` de ${data.total}`})
              {filterLabel && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  — {filterLabel}
                </span>
              )}
            </CardTitle>
            {filter !== 'all' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilter('all')}
                className="h-7 text-xs"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Limpar filtro
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">Filtrar:</span>
            <ToggleGroup
              type="single"
              value={filter}
              onValueChange={(v) => v && setFilter(v as FilterValue)}
              size="sm"
              variant="outline"
              className="flex-wrap justify-start gap-1"
            >
              <ToggleGroupItem value="all" className="text-xs h-8 px-3">Todos</ToggleGroupItem>
              <ToggleGroupItem value="very_active" className="text-xs h-8 px-3">Muito Ativo</ToggleGroupItem>
              <ToggleGroupItem value="regular" className="text-xs h-8 px-3">Regular</ToggleGroupItem>
              <ToggleGroupItem value="low" className="text-xs h-8 px-3">Pouco Ativo</ToggleGroupItem>
              <ToggleGroupItem value="inactive" className="text-xs h-8 px-3">Inativo</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {filteredVolunteers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhum voluntário neste status
            </p>
          ) : (
            filteredVolunteers.map((vol) => {
              const config = levelConfig[vol.level];
              const progressValue = data.maxSchedules > 0
                ? (vol.total_schedules / data.maxSchedules) * 100
                : 0;

              const historyUrl = vol.volunteer_id
                ? `/history/${vol.volunteer_id}`
                : `/history/by-name/${encodeURIComponent(vol.volunteer_name)}`;

              return (
                <Link
                  key={vol.planning_center_person_id}
                  to={historyUrl}
                  className="flex items-center gap-3 py-2 px-2 -mx-2 rounded hover:bg-muted/50 transition-colors border-b last:border-0"
                >
                  <Badge variant="outline" className={`text-xs shrink-0 ${config.badgeClass}`}>
                    {config.label}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{vol.volunteer_name}</p>
                    {vol.team_name && (
                      <p className="text-xs text-muted-foreground truncate">{vol.team_name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-16 hidden sm:block">
                      <Progress value={progressValue} className="h-1.5" />
                    </div>
                    <span className="text-xs text-muted-foreground w-16 text-right">
                      {vol.total_checkins}/{vol.total_schedules} escalas
                    </span>
                    <History className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
