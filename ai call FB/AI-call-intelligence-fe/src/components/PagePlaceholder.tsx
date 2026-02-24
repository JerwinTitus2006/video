import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui';

interface PagePlaceholderProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<any>;
  children?: React.ReactNode;
}

const PagePlaceholder: React.FC<PagePlaceholderProps> = ({ 
  title, 
  description,
  icon: Icon,
  children 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="text-center py-12">
        {Icon && (
          <div className="mx-auto w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mb-4">
            <Icon className="w-8 h-8 text-accent" />
          </div>
        )}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {title}
        </h1>
        {description && (
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            {description}
          </p>
        )}
      </div>

      <Card className="p-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-accent/10 text-accent">
            Coming Soon
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            This page is under development. Check back soon for updates!
          </p>
          {children}
        </div>
      </Card>
    </motion.div>
  );
};

export default PagePlaceholder;