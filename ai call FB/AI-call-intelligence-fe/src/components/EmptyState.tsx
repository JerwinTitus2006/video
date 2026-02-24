import React from 'react';
import { motion } from 'framer-motion';
import {
  InboxIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ChartBarIcon,
  FolderOpenIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui';

export type EmptyStateType = 
  | 'no-data' 
  | 'search' 
  | 'filter' 
  | 'documents' 
  | 'users' 
  | 'analytics' 
  | 'folder' 
  | 'error'
  | 'custom';

interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  actionLabel?: string;
  secondaryActionLabel?: string;
  onAction?: () => void;
  onSecondaryAction?: () => void;
  className?: string;
  showAction?: boolean;
  showSecondaryAction?: boolean;
  illustration?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const emptyStateConfigs: Record<EmptyStateType, {
  icon: React.ComponentType<{ className?: string }>;
  defaultTitle: string;
  defaultDescription: string;
  actionLabel?: string;
  color: string;
}> = {
  'no-data': {
    icon: InboxIcon,
    defaultTitle: 'No data available',
    defaultDescription: "There's nothing to show here yet. Start by adding your first item.",
    actionLabel: 'Add Item',
    color: 'text-gray-400'
  },
  'search': {
    icon: MagnifyingGlassIcon,
    defaultTitle: 'No results found',
    defaultDescription: "We couldn't find anything matching your search. Try different keywords or adjust your filters.",
    actionLabel: 'Clear Search',
    color: 'text-gray-400'
  },
  'filter': {
    icon: ExclamationTriangleIcon,
    defaultTitle: 'No matches found',
    defaultDescription: 'No items match your current filter criteria. Try adjusting your filters or clearing them.',
    actionLabel: 'Clear Filters',
    color: 'text-gray-400'
  },
  'documents': {
    icon: DocumentTextIcon,
    defaultTitle: 'No documents',
    defaultDescription: "You haven't uploaded any documents yet. Start by uploading your first document.",
    actionLabel: 'Upload Document',
    color: 'text-blue-400'
  },
  'users': {
    icon: UserGroupIcon,
    defaultTitle: 'No users found',
    defaultDescription: 'There are no users to display. Invite team members to get started.',
    actionLabel: 'Invite Users',
    color: 'text-green-400'
  },
  'analytics': {
    icon: ChartBarIcon,
    defaultTitle: 'No analytics data',
    defaultDescription: 'Not enough data to display analytics. Continue using the app to see insights.',
    actionLabel: 'Learn More',
    color: 'text-purple-400'
  },
  'folder': {
    icon: FolderOpenIcon,
    defaultTitle: 'Empty folder',
    defaultDescription: 'This folder is empty. Add files or create new folders to organize your content.',
    actionLabel: 'Add Files',
    color: 'text-orange-400'
  },
  'error': {
    icon: ExclamationTriangleIcon,
    defaultTitle: 'Unable to load data',
    defaultDescription: 'Something went wrong while loading the data. Please try refreshing the page.',
    actionLabel: 'Refresh',
    color: 'text-red-400'
  },
  'custom': {
    icon: InboxIcon,
    defaultTitle: 'Empty state',
    defaultDescription: 'Nothing to show here.',
    color: 'text-gray-400'
  }
};

const sizeConfig = {
  sm: {
    container: 'p-6',
    icon: 'w-12 h-12',
    title: 'text-lg',
    description: 'text-sm',
    spacing: 'space-y-3'
  },
  md: {
    container: 'p-8',
    icon: 'w-16 h-16',
    title: 'text-xl',
    description: 'text-base',
    spacing: 'space-y-4'
  },
  lg: {
    container: 'p-12',
    icon: 'w-20 h-20',
    title: 'text-2xl',
    description: 'text-lg',
    spacing: 'space-y-6'
  }
};

const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'no-data',
  title,
  description,
  icon: CustomIcon,
  actionLabel,
  secondaryActionLabel = 'Cancel',
  onAction,
  onSecondaryAction,
  className = '',
  showAction = true,
  showSecondaryAction = false,
  illustration,
  size = 'md'
}) => {
  const config = emptyStateConfigs[type];
  const sizeConf = sizeConfig[size];
  const Icon = CustomIcon || config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`flex flex-col items-center justify-center text-center ${sizeConf.container} ${className}`}
    >
      <div className={sizeConf.spacing}>
        {/* Custom Illustration or Icon */}
        {illustration ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex justify-center mb-4"
          >
            {illustration}
          </motion.div>
        ) : (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={`${sizeConf.icon} ${config.color} mx-auto`}
          >
            <Icon className="w-full h-full" />
          </motion.div>
        )}

        {/* Title and Description */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="max-w-md mx-auto"
        >
          <h3 className={`font-semibold text-gray-900 dark:text-white mb-2 ${sizeConf.title}`}>
            {title || config.defaultTitle}
          </h3>
          <p className={`text-gray-500 dark:text-gray-400 leading-relaxed ${sizeConf.description}`}>
            {description || config.defaultDescription}
          </p>
        </motion.div>

        {/* Action Buttons */}
        {(showAction || showSecondaryAction) && (onAction || onSecondaryAction) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            {showAction && onAction && (
              <Button
                onClick={onAction}
                className="bg-accent hover:bg-accent-600 text-white"
              >
                {type === 'error' ? (
                  <ArrowPathIcon className="w-4 h-4 mr-2" />
                ) : (
                  <PlusIcon className="w-4 h-4 mr-2" />
                )}
                {actionLabel || config.actionLabel || 'Take Action'}
              </Button>
            )}
            {showSecondaryAction && onSecondaryAction && (
              <Button
                onClick={onSecondaryAction}
                variant="outline"
                className="border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                {secondaryActionLabel}
              </Button>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default EmptyState;