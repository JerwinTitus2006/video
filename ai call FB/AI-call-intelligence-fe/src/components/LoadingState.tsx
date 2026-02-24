import React from 'react';
import { motion } from 'framer-motion';

export type LoadingType = 'spinner' | 'dots' | 'pulse' | 'skeleton' | 'progress';
export type LoadingSize = 'sm' | 'md' | 'lg' | 'xl';

interface LoadingStateProps {
  type?: LoadingType;
  size?: LoadingSize;
  message?: string;
  progress?: number;
  className?: string;
  color?: string;
  overlay?: boolean;
}

const sizeConfig = {
  sm: {
    container: 'p-4',
    icon: 'w-6 h-6',
    text: 'text-sm',
    dot: 'w-2 h-2',
  },
  md: {
    container: 'p-6',
    icon: 'w-8 h-8',
    text: 'text-base',
    dot: 'w-3 h-3',
  },
  lg: {
    container: 'p-8',
    icon: 'w-12 h-12',
    text: 'text-lg',
    dot: 'w-4 h-4',
  },
  xl: {
    container: 'p-12',
    icon: 'w-16 h-16',
    text: 'text-xl',
    dot: 'w-5 h-5',
  },
};

const SpinnerLoader: React.FC<{ size: LoadingSize; color: string }> = ({ size, color }) => {
  const sizeClass = sizeConfig[size].icon;
  
  return (
    <motion.div
      className={`relative ${sizeClass}`}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    >
      <div className={`absolute inset-0 border-4 border-gray-200 dark:border-gray-700 rounded-full`} />
      <div className={`absolute inset-0 border-4 border-t-transparent border-r-transparent border-b-transparent rounded-full ${color}`} />
    </motion.div>
  );
};

const DotsLoader: React.FC<{ size: LoadingSize; color: string }> = ({ size, color }) => {
  const dotSize = sizeConfig[size].dot;
  
  return (
    <div className="flex space-x-1">
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className={`${dotSize} rounded-full ${color}`}
          animate={{
            y: [-4, 4, -4],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: index * 0.2,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

const PulseLoader: React.FC<{ size: LoadingSize; color: string }> = ({ size, color }) => {
  const sizeClass = sizeConfig[size].icon;
  
  return (
    <motion.div
      className={`${sizeClass} rounded-full ${color}`}
      animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
};

const SkeletonLoader: React.FC<{ size: LoadingSize }> = ({ size }) => {
  const containerClass = sizeConfig[size].container;
  
  return (
    <div className={`space-y-4 ${containerClass}`}>
      <motion.div
        className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <motion.div
        className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
      />
      <motion.div
        className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
      />
    </div>
  );
};

const ProgressLoader: React.FC<{ progress: number; color: string }> = ({ progress, color }) => {
  return (
    <div className="w-full max-w-md">
      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
        <span>Loading...</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <motion.div
          className={`h-2 rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

const LoadingState: React.FC<LoadingStateProps> = ({
  type = 'spinner',
  size = 'md',
  message = 'Loading...',
  progress = 0,
  className = '',
  color = 'border-accent bg-accent text-accent',
  overlay = false,
}) => {
  const containerClass = sizeConfig[size].container;
  const textClass = sizeConfig[size].text;

  const renderLoader = () => {
    switch (type) {
      case 'dots':
        return <DotsLoader size={size} color={color} />;
      case 'pulse':
        return <PulseLoader size={size} color={color} />;
      case 'skeleton':
        return <SkeletonLoader size={size} />;
      case 'progress':
        return <ProgressLoader progress={progress} color={color} />;
      default:
        return <SpinnerLoader size={size} color={color} />;
    }
  };

  const content = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col items-center justify-center text-center ${containerClass} ${className}`}
    >
      {type !== 'skeleton' && renderLoader()}
      {type === 'skeleton' && renderLoader()}
      
      {message && type !== 'skeleton' && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`text-gray-600 dark:text-gray-400 mt-4 ${textClass}`}
        >
          {message}
        </motion.p>
      )}
    </motion.div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          {content}
        </div>
      </div>
    );
  }

  return content;
};

export default LoadingState;