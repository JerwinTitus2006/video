import React from 'react';
import { clsx } from 'clsx';
import type { StatusType } from '@/types';

interface StatusBadgeProps {
  status: StatusType;
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  text, 
  size = 'md',
  variant = 'default'
}) => {
  const statusConfig = {
    success: {
      color: 'green',
      defaultText: 'Success'
    },
    warning: {
      color: 'yellow',
      defaultText: 'Warning'
    },
    error: {
      color: 'red',
      defaultText: 'Error'
    },
    info: {
      color: 'blue',
      defaultText: 'Info'
    },
    pending: {
      color: 'orange',
      defaultText: 'Pending'
    },
    in_progress: {
      color: 'blue',
      defaultText: 'In Progress'
    },
    completed: {
      color: 'green',
      defaultText: 'Completed'
    },
    cancelled: {
      color: 'red',
      defaultText: 'Cancelled'
    },
  };

  const config = statusConfig[status] || statusConfig.info;
  const displayText = text || config.defaultText;
  const colorName = config.color;

  const baseClasses = 'inline-flex items-center font-medium rounded-full';
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  const variantClasses = {
    default: {
      green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    },
    outline: {
      green: 'border border-green-300 text-green-700 dark:border-green-600 dark:text-green-400',
      yellow: 'border border-yellow-300 text-yellow-700 dark:border-yellow-600 dark:text-yellow-400',
      red: 'border border-red-300 text-red-700 dark:border-red-600 dark:text-red-400',
      blue: 'border border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-400',
      orange: 'border border-orange-300 text-orange-700 dark:border-orange-600 dark:text-orange-400',
    },
  };

  const classes = clsx(
    baseClasses,
    sizeClasses[size],
    variantClasses[variant][colorName as keyof typeof variantClasses[typeof variant]]
  );

  return (
    <span className={classes}>
      {displayText}
    </span>
  );
};

export default StatusBadge;