import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card } from '@/components/ui/Card';

interface DataPoint {
  name: string;
  value: number;
  color?: string;
}

interface PieChartComponentProps {
  data: DataPoint[];
  title: string;
  height?: number;
  colors?: string[];
  showLegend?: boolean;
  innerRadius?: number;
}

const DEFAULT_COLORS = ['#982598', '#E491C9', '#15173D', '#F1E9E9', '#6366F1', '#10B981'];

const PieChartComponent: React.FC<PieChartComponentProps> = ({
  data,
  title,
  height = 300,
  colors = DEFAULT_COLORS,
  showLegend = true,
  innerRadius = 0
}) => {
  return (
    <Card>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={height / 3}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color || colors[index % colors.length]} 
                />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                backdropFilter: 'blur(10px)'
              }}
              labelStyle={{ color: '#374151' }}
            />
            {showLegend && (
              <Legend 
                wrapperStyle={{
                  fontSize: '14px',
                  color: '#374151'
                }}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default PieChartComponent;