import React from 'react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'gradient';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default',
  padding = 'md',
  hover = false,
  onClick,
}) => {
  const baseClasses = 'rounded-2xl border transition-all duration-200';
  
  const variants = {
    default: 'bg-white border-neutral-200 dark:bg-neutral-900 dark:border-neutral-700',
    glass: 'bg-white/10 backdrop-blur-sm border-white/20 shadow-glass',
    gradient: 'bg-gradient-to-br from-white to-neutral-50 border-neutral-200 dark:from-neutral-900 dark:to-neutral-800 dark:border-neutral-700',
  };

  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const classes = clsx(
    baseClasses,
    variants[variant],
    paddings[padding],
    hover && 'hover:shadow-lg hover:scale-[1.02] cursor-pointer',
    onClick && 'cursor-pointer',
    className
  );

  const CardComponent = onClick ? motion.div : 'div';
  const motionProps = onClick ? {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
    onClick,
  } : {};

  return (
    <CardComponent className={classes} {...motionProps}>
      {children}
    </CardComponent>
  );
};

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

const CardHeader: React.FC<CardHeaderProps> = ({ children, className, action }) => {
  return (
    <div className={clsx('flex items-center justify-between mb-4', className)}>
      <div>{children}</div>
      {action && <div>{action}</div>}
    </div>
  );
};

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const CardTitle: React.FC<CardTitleProps> = ({ children, className, size = 'md' }) => {
  const sizes = {
    sm: 'text-lg font-semibold',
    md: 'text-xl font-semibold',
    lg: 'text-2xl font-bold',
  };

  return (
    <h3 className={clsx(sizes[size], 'text-neutral-900 dark:text-white', className)}>
      {children}
    </h3>
  );
};

interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

const CardDescription: React.FC<CardDescriptionProps> = ({ children, className }) => {
  return (
    <p className={clsx('text-sm text-neutral-600 dark:text-neutral-300', className)}>
      {children}
    </p>
  );
};

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

const CardContent: React.FC<CardContentProps> = ({ children, className }) => {
  return (
    <div className={clsx('space-y-4', className)}>
      {children}
    </div>
  );
};

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right' | 'between';
}

const CardFooter: React.FC<CardFooterProps> = ({ children, className, align = 'left' }) => {
  const alignments = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div className={clsx('flex items-center mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-700', alignments[align], className)}>
      {children}
    </div>
  );
};

// Compound component exports with proper typing
type CardComponent = React.FC<CardProps> & {
  Header: React.FC<CardHeaderProps>;
  Title: React.FC<CardTitleProps>;
  Description: React.FC<CardDescriptionProps>;
  Content: React.FC<CardContentProps>;
  Footer: React.FC<CardFooterProps>;
};

(Card as CardComponent).Header = CardHeader;
(Card as CardComponent).Title = CardTitle;
(Card as CardComponent).Description = CardDescription;
(Card as CardComponent).Content = CardContent;
(Card as CardComponent).Footer = CardFooter;

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
export default Card;