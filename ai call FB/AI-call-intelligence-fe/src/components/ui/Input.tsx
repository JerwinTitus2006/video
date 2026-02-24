import React, { forwardRef } from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      helpText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    const inputClasses = clsx(
      'w-full px-4 py-3 border rounded-xl transition-all duration-200',
      'placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-offset-1',
      'disabled:bg-neutral-50 disabled:cursor-not-allowed',
      'dark:bg-neutral-800 dark:border-neutral-600 dark:text-white dark:placeholder-neutral-500',
      {
        'border-red-300 focus:border-red-500 focus:ring-red-500/50': error,
        'border-neutral-300 focus:border-accent focus:ring-accent/50': !error,
        'pl-11': leftIcon,
        'pr-11': rightIcon,
      },
      className
    );

    const containerClasses = clsx(
      'space-y-1',
      fullWidth && 'w-full'
    );

    return (
      <div className={containerClasses}>
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400">
              {leftIcon}
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            className={inputClasses}
            {...props}
          />
          
          {rightIcon && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400">
              {rightIcon}
            </div>
          )}
        </div>
        
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        
        {helpText && !error && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{helpText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;