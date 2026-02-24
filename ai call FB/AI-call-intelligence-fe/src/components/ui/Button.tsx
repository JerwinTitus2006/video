import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onAnimationStart' | 'onDragStart' | 'onDragEnd' | 'onDrag'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      ...props
    },
    ref
  ) => {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variants = {
      primary: 'bg-accent text-white hover:bg-accent-700 focus:ring-accent/50 shadow-lg hover:shadow-xl active:scale-95',
      secondary: 'bg-neutral-100 text-primary-900 hover:bg-neutral-200 focus:ring-neutral-300 shadow-sm hover:shadow-md active:scale-95 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700',
      outline: 'border border-neutral-300 bg-transparent text-neutral-700 hover:bg-neutral-50 focus:ring-neutral-300 active:scale-95 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800',
      ghost: 'text-primary-700 hover:bg-primary-50 focus:ring-primary-100 active:scale-95 dark:text-neutral-300 dark:hover:bg-neutral-800',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500/50 shadow-lg hover:shadow-xl active:scale-95',
      success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500/50 shadow-lg hover:shadow-xl active:scale-95',
    };
    
    const sizes = {
      sm: 'text-sm px-3 py-2 gap-1.5',
      md: 'text-sm px-4 py-2.5 gap-2',
      lg: 'text-base px-6 py-3 gap-2.5',
    };
    
    const classes = clsx(
      baseClasses,
      variants[variant],
      sizes[size],
      fullWidth && 'w-full',
      className
    );

    const iconElement = loading ? (
      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    ) : icon;

    return (
      <motion.button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        whileHover={{ scale: !disabled && !loading ? 1.02 : 1 }}
        whileTap={{ scale: !disabled && !loading ? 0.98 : 1 }}
        {...props}
      >
        {iconElement && iconPosition === 'left' && iconElement}
        {children}
        {iconElement && iconPosition === 'right' && iconElement}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export default Button;