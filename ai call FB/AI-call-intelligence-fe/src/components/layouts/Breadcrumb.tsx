import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';
import type { BreadcrumbItem } from '@/types';

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className }) => {
  const location = useLocation();

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Home', path: '/dashboard' },
    ...items,
  ];

  return (
    <nav className={`flex ${className}`} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          const isCurrent = item.path === location.pathname;

          return (
            <li key={item.path || index} className="flex items-center">
              {index === 0 && (
                <HomeIcon className="w-4 h-4 text-neutral-400 mr-2" />
              )}
              
              {index > 0 && (
                <ChevronRightIcon className="w-4 h-4 text-neutral-400 mr-2" />
              )}
              
              {item.path && !isLast && !isCurrent ? (
                <Link
                  to={item.path}
                  className="text-sm font-medium text-neutral-600 hover:text-accent transition-colors dark:text-neutral-400 dark:hover:text-accent"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={`text-sm font-medium ${
                  isLast || isCurrent 
                    ? 'text-neutral-900 dark:text-white' 
                    : 'text-neutral-600 dark:text-neutral-400'
                }`}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;