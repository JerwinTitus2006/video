import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';
export type NotificationPosition = 
  | 'top-left' | 'top-center' | 'top-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  showNotification: (notification: Omit<Notification, 'id'>) => string;
  hideNotification: (id: string) => void;
  clearAll: () => void;
  position: NotificationPosition;
  setPosition: (position: NotificationPosition) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

const notificationConfig = {
  success: {
    icon: CheckCircleIcon,
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    iconColor: 'text-green-600 dark:text-green-400',
    titleColor: 'text-green-800 dark:text-green-300',
    messageColor: 'text-green-700 dark:text-green-400',
    closeColor: 'text-green-400 hover:text-green-500 dark:text-green-300 dark:hover:text-green-200'
  },
  error: {
    icon: XCircleIcon,
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    iconColor: 'text-red-600 dark:text-red-400',
    titleColor: 'text-red-800 dark:text-red-300',
    messageColor: 'text-red-700 dark:text-red-400',
    closeColor: 'text-red-400 hover:text-red-500 dark:text-red-300 dark:hover:text-red-200'
  },
  warning: {
    icon: ExclamationTriangleIcon,
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    titleColor: 'text-yellow-800 dark:text-yellow-300',
    messageColor: 'text-yellow-700 dark:text-yellow-400',
    closeColor: 'text-yellow-400 hover:text-yellow-500 dark:text-yellow-300 dark:hover:text-yellow-200'
  },
  info: {
    icon: InformationCircleIcon,
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    iconColor: 'text-blue-600 dark:text-blue-400',
    titleColor: 'text-blue-800 dark:text-blue-300',
    messageColor: 'text-blue-700 dark:text-blue-400',
    closeColor: 'text-blue-400 hover:text-blue-500 dark:text-blue-300 dark:hover:text-blue-200'
  }
};

const positionConfig: Record<NotificationPosition, string> = {
  'top-left': 'top-4 left-4',
  'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
  'top-right': 'top-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
  'bottom-right': 'bottom-4 right-4'
};

const Toast: React.FC<{
  notification: Notification;
  onClose: (id: string) => void;
}> = ({ notification, onClose }) => {
  const config = notificationConfig[notification.type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`
        relative max-w-sm w-full shadow-lg rounded-lg border p-4
        ${config.bgColor} ${config.borderColor}
      `}
    >
      <div className="flex items-start">
        {/* Icon */}
        <div className="flex-shrink-0">
          <Icon className={`w-5 h-5 ${config.iconColor}`} />
        </div>

        {/* Content */}
        <div className="ml-3 flex-1">
          <p className={`text-sm font-medium ${config.titleColor}`}>
            {notification.title}
          </p>
          {notification.message && (
            <p className={`mt-1 text-sm ${config.messageColor}`}>
              {notification.message}
            </p>
          )}
          
          {/* Action Button */}
          {notification.action && (
            <div className="mt-3">
              <button
                onClick={notification.action.onClick}
                className={`
                  text-sm font-medium rounded-md px-3 py-1.5
                  ${config.titleColor} hover:bg-white/20 dark:hover:bg-black/20
                  transition-colors duration-200
                `}
              >
                {notification.action.label}
              </button>
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="flex-shrink-0 ml-4">
          <button
            onClick={() => onClose(notification.id)}
            className={`
              inline-flex rounded-md p-1.5 transition-colors duration-200
              ${config.closeColor}
            `}
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const ToastContainer: React.FC<{
  notifications: Notification[];
  position: NotificationPosition;
  onClose: (id: string) => void;
}> = ({ notifications, position, onClose }) => {
  const isBottom = position.includes('bottom');
  const orderedNotifications = isBottom ? [...notifications].reverse() : notifications;

  return (
    <div className={`fixed z-50 space-y-3 ${positionConfig[position]} pointer-events-none`}>
      <AnimatePresence>
        {orderedNotifications.map((notification) => (
          <div key={notification.id} className="pointer-events-auto">
            <Toast notification={notification} onClose={onClose} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [position, setPosition] = useState<NotificationPosition>('top-right');

  const showNotification = useCallback((notificationData: Omit<Notification, 'id'>) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const notification: Notification = {
      ...notificationData,
      id,
      duration: notificationData.duration ?? 5000,
    };

    setNotifications(prev => [...prev, notification]);

    // Auto-hide notification if not persistent
    if (!notification.persistent && notification.duration && notification.duration > 0) {
      setTimeout(() => {
        hideNotification(id);
      }, notification.duration);
    }

    return id;
  }, []);

  const hideNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Keyboard shortcut to clear all notifications
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'k') {
        event.preventDefault();
        clearAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearAll]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      showNotification,
      hideNotification,
      clearAll,
      position,
      setPosition
    }}>
      {children}
      <ToastContainer
        notifications={notifications}
        position={position}
        onClose={hideNotification}
      />
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Convenience hooks for different notification types
export const useToast = () => {
  const { showNotification } = useNotifications();
  
  return {
    success: (title: string, message?: string, options?: Partial<Notification>) => 
      showNotification({ ...options, type: 'success', title, message }),
    error: (title: string, message?: string, options?: Partial<Notification>) => 
      showNotification({ ...options, type: 'error', title, message }),
    warning: (title: string, message?: string, options?: Partial<Notification>) => 
      showNotification({ ...options, type: 'warning', title, message }),
    info: (title: string, message?: string, options?: Partial<Notification>) => 
      showNotification({ ...options, type: 'info', title, message }),
  };
};