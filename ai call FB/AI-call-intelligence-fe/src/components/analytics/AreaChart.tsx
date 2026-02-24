import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/Card';

interface DataPoint {
  name: string;
  value: number;
  previous?: number;
}

interface AreaChartComponentProps {
  data: DataPoint[];
  title: string;
  height?: number;
  color?: string;
  showPrevious?: boolean;
}

const AreaChartComponent: React.FC<AreaChartComponentProps> = ({
  data,
  title,
  height = 300,
  color = '#982598',
  showPrevious = false
}) => {
  return (
    <Card>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data}>
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
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={color}
              fill={`${color}20`}
              strokeWidth={2}
            />
            {showPrevious && (
              <Area 
                type="monotone" 
                dataKey="previous" 
                stroke="#e5e7eb"
                fill="transparent"
                strokeDasharray="5 5"
                strokeWidth={1}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default AreaChartComponent;