import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/Card';

interface DataPoint {
  name: string;
  value: number;
  trend?: number;
}

interface LineChartComponentProps {
  data: DataPoint[];
  title: string;
  height?: number;
  color?: string;
  showTrend?: boolean;
  smooth?: boolean;
}

const LineChartComponent: React.FC<LineChartComponentProps> = ({
  data,
  title,
  height = 300,
  color = '#982598',
  showTrend = false,
  smooth = true
}) => {
  return (
    <Card>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              className="text-sm text-gray-600"
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              className="text-sm text-gray-600"
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                backdropFilter: 'blur(10px)'
              }}
              labelStyle={{ color: '#374151' }}
            />
            <Line 
              type={smooth ? "monotone" : "linear"}
              dataKey="value" 
              stroke={color}
              strokeWidth={3}
              dot={{ fill: color, strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: color }}
            />
            {showTrend && (
              <Line 
                type="monotone"
                dataKey="trend" 
                stroke="#e5e7eb"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default LineChartComponent;