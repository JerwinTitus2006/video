import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircleIcon, 
  ExclamationCircleIcon, 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useUIStore } from '@/store';
import type { ToastType } from '@/types';

interface ToastProps {
  toast: ToastType;
}

const Toast: React.FC<ToastProps> = ({ toast }) => {
  const { removeToast } = useUIStore();

  const icons = {
    success: CheckCircleIcon,
    error: ExclamationCircleIcon,
    warning: ExclamationTriangleIcon,
    info: InformationCircleIcon,
  };

  const colors = {
    success: 'text-green-400 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
    error: 'text-red-400 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
    warning: 'text-yellow-400 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
    info: 'text-blue-400 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
  };

  const Icon = icons[toast.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      className={`relative flex w-full max-w-sm items-start space-x-3 rounded-lg border p-4 shadow-lg backdrop-blur-sm ${colors[toast.type]}`}
    >
      <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-900 dark:text-white">
          {toast.title}
        </p>
        {toast.message && (
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            {toast.message}
          </p>
        )}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="mt-2 text-sm font-medium text-accent hover:text-accent-700 transition-colors"
          >
            {toast.action.label}
          </button>
        )}
      </div>

      <button
        onClick={() => removeToast(toast.id)}
        className="flex-shrink-0 p-1 rounded-md text-neutral-400 hover:text-neutral-600 transition-colors"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
    </motion.div>
  );
};

const ToastContainer: React.FC = () => {
  const { toasts } = useUIStore();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col space-y-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
};

export { Toast, ToastContainer };
export default ToastContainer;