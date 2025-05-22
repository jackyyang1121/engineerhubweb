import React, { useEffect } from 'react';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useUIStore } from '../../store/uiStore';
import type { ToastType } from '../../types';

interface ToastProps {
  message: string;
  type: ToastType;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ 
  message, 
  type, 
  isVisible, 
  onClose, 
  duration = 3000 
}) => {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const getToastConfig = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircleIcon,
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-800',
          iconColor: 'text-green-400',
          textColor: 'text-green-800 dark:text-green-200'
        };
      case 'error':
        return {
          icon: ExclamationCircleIcon,
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          iconColor: 'text-red-400',
          textColor: 'text-red-800 dark:text-red-200'
        };
      case 'warning':
        return {
          icon: ExclamationTriangleIcon,
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          iconColor: 'text-yellow-400',
          textColor: 'text-yellow-800 dark:text-yellow-200'
        };
      case 'info':
        return {
          icon: InformationCircleIcon,
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-800',
          iconColor: 'text-blue-400',
          textColor: 'text-blue-800 dark:text-blue-200'
        };
    }
  };

  const config = getToastConfig(type);
  const IconComponent = config.icon;

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-from-top">
      <div className={`max-w-sm w-full ${config.bgColor} border ${config.borderColor} rounded-lg shadow-lg p-4`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <IconComponent className={`h-5 w-5 ${config.iconColor}`} aria-hidden="true" />
          </div>
          <div className="ml-3 w-0 flex-1">
            <p className={`text-sm font-medium ${config.textColor}`}>
              {message}
            </p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={onClose}
              className={`inline-flex ${config.textColor} hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-500 rounded-md p-1`}
            >
              <span className="sr-only">關閉</span>
              <XMarkIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 全局 Toast 容器組件
export const GlobalToast: React.FC = () => {
  const { toast, hideToast } = useUIStore();

  if (!toast) return null;

  return (
    <Toast
      message={toast.message}
      type={toast.type}
      isVisible={toast.isVisible}
      onClose={hideToast}
    />
  );
};

export default Toast; 