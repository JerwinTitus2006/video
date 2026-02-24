import React from 'react';
import { motion } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  WifiIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui';

export type ErrorType = 'network' | 'server' | 'permission' | 'timeout' | 'validation' | 'unknown';

interface ErrorStateProps {
  type?: ErrorType;
  title?: string;
  message?: string;
  onRetry?: () => void;
  onBack?: () => void;
  retryLabel?: string;
  className?: string;
  showRetry?: boolean;
  showBack?: boolean;
}

const errorConfigs: Record<ErrorType, {
  icon: React.ComponentType<{ className?: string }>;
  defaultTitle: string;
  defaultMessage: string;
  color: string;
}> = {
  network: {
    icon: WifiIcon,
    defaultTitle: 'Connection Problem',
    defaultMessage: 'Unable to connect to the server. Please check your internet connection and try again.',
    color: 'text-orange-500',
  },
  server: {
    icon: ExclamationTriangleIcon,
    defaultTitle: 'Server Error',
    defaultMessage: 'Something went wrong on our end. Our team has been notified and is working on a fix.',
    color: 'text-red-500',
  },
  permission: {
    icon: ExclamationTriangleIcon,
    defaultTitle: 'Access Denied',
    defaultMessage: 'You do not have permission to access this resource. Please contact your administrator.',
    color: 'text-yellow-500',
  },
  timeout: {
    icon: ExclamationTriangleIcon,
    defaultTitle: 'Request Timeout',
    defaultMessage: 'The request took too long to complete. Please try again.',
    color: 'text-blue-500',
  },
  validation: {
    icon: ExclamationTriangleIcon,
    defaultTitle: 'Invalid Data',
    defaultMessage: 'The data you provided is invalid. Please check and try again.',
    color: 'text-purple-500',
  },
  unknown: {
    icon: ExclamationTriangleIcon,
    defaultTitle: 'Unexpected Error',
    defaultMessage: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
    color: 'text-gray-500',
  },
};

const ErrorState: React.FC<ErrorStateProps> = ({
  type = 'unknown',
  title,
  message,
  onRetry,
  onBack,
  retryLabel = 'Try Again',
  className = '',
  showRetry = true,
  showBack = false,
}) => {
  const config = errorConfigs[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`flex flex-col items-center justify-center text-center p-8 ${className}`}
    >
      {/* Error Icon */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className={`w-16 h-16 ${config.color} mb-4`}
      >
        <Icon className="w-full h-full" />
      </motion.div>

      {/* Error Message */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="max-w-md"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {title || config.defaultTitle}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
          {message || config.defaultMessage}
        </p>
      </motion.div>

      {/* Action Buttons */}
      {(showRetry || showBack) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          {showRetry && onRetry && (
            <Button
              onClick={onRetry}
              className="bg-accent hover:bg-accent-600 text-white"
            >
              <ArrowPathIcon className="w-4 h-4 mr-2" />
              {retryLabel}
            </Button>
          )}
          {showBack && onBack && (
            <Button
              onClick={onBack}
              variant="secondary"
              className="border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Go Back
            </Button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default ErrorState;