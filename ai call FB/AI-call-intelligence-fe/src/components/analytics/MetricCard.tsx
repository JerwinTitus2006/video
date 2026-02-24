import React from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/20/solid';
import { Card } from '@/components/ui/Card';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color?: 'purple' | 'blue' | 'green' | 'red' | 'yellow';
  trend?: 'up' | 'down' | 'neutral';
}

const colorClasses = {
  purple: 'bg-gradient-to-r from-purple-500 to-purple-600',
  blue: 'bg-gradient-to-r from-blue-500 to-blue-600',
  green: 'bg-gradient-to-r from-green-500 to-green-600',
  red: 'bg-gradient-to-r from-red-500 to-red-600',
  yellow: 'bg-gradient-to-r from-yellow-500 to-yellow-600',
};

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  color = 'purple',
  trend = 'neutral'
}) => {
  return (
    <Card variant="glass">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <div className="text-3xl font-bold text-gray-900">{value}</div>
            
            {change !== undefined && (
              <div className="flex items-center mt-2 text-sm">
                {trend === 'up' ? (
                  <ArrowUpIcon className="h-4 w-4 text-green-600 mr-1" />
                ) : trend === 'down' ? (
                  <ArrowDownIcon className="h-4 w-4 text-red-600 mr-1" />
                ) : null}
                <span className={`font-medium ${
                  trend === 'up' ? 'text-green-600' : 
                  trend === 'down' ? 'text-red-600' : 
                  'text-gray-600'
                }`}>
                  {change > 0 && trend !== 'down' ? '+' : ''}{change}%
                </span>
                {changeLabel && (
                  <span className="text-gray-500 ml-1">{changeLabel}</span>
                )}
              </div>
            )}
          </div>
          
          {Icon && (
            <div className={`p-3 rounded-2xl ${colorClasses[color]}`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default MetricCard;