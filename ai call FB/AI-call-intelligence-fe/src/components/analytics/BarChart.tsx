import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/Card';

interface DataPoint {
  name: string;
  value: number;
  category?: string;
}

interface BarChartComponentProps {
  data: DataPoint[];
  title: string;
  height?: number;
  color?: string;
  orientation?: 'horizontal' | 'vertical';
}

const BarChartComponent: React.FC<BarChartComponentProps> = ({
  data,
  title,
  height = 300,
  color = '#982598',
  orientation = 'vertical'
}) => {
  return (
    <Card>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart 
            data={data}
            layout={orientation === 'horizontal' ? 'horizontal' : 'vertical'}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              type={orientation === 'horizontal' ? 'number' : 'category'}
              dataKey={orientation === 'horizontal' ? 'value' : 'name'}
              axisLine={false}
              tickLine={false}
              className="text-sm text-gray-600"
            />
            <YAxis 
              type={orientation === 'horizontal' ? 'category' : 'number'}
              dataKey={orientation === 'horizontal' ? 'name' : 'value'}
              axisLine={false}
              tickLine={false}
              className="text-sm text-gray-600"
              width={orientation === 'horizontal' ? 100 : 50}
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
            <Bar 
              dataKey="value" 
              fill={color}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default BarChartComponent;