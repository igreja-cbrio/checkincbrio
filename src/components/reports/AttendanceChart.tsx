import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { AttendanceReport } from '@/hooks/useReports';

interface AttendanceChartProps {
  data: AttendanceReport[];
}

export function AttendanceChart({ data }: AttendanceChartProps) {
  const chartData = data.slice(0, 10).map(item => ({
    name: item.volunteer_name.split(' ')[0], // First name only
    fullName: item.volunteer_name,
    rate: Math.round(item.attendance_rate),
    scheduled: item.total_scheduled,
    checkedIn: item.total_checked_in,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 10 - Taxa de Presença</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" domain={[0, 100]} unit="%" />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={80}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                formatter={(value: number, name: string, props: any) => [
                  `${value}% (${props.payload.checkedIn}/${props.payload.scheduled})`,
                  'Taxa de Presença'
                ]}
                labelFormatter={(label: string, payload: any) => 
                  payload?.[0]?.payload?.fullName || label
                }
              />
              <Bar 
                dataKey="rate" 
                fill="hsl(var(--primary))" 
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
