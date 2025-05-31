import React, { forwardRef } from 'react';
import type { ButtonVariant, ButtonSize } from '../../types';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className = '',
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    children,
    icon,
    iconPosition = 'left',
    fullWidth = false,
    ...props
  }, ref) => {
    // 基礎樣式
    const baseStyles = [
      'inline-flex items-center justify-center rounded-md font-medium transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:pointer-events-none',
      fullWidth && 'w-full'
    ].filter(Boolean).join(' ');

    // 變體樣式
    const variantStyles = {
      primary: [
        'bg-blue-600 text-white shadow-sm',
        'hover:bg-blue-700 active:bg-blue-800',
        'focus:ring-blue-500',
        'dark:bg-blue-600 dark:hover:bg-blue-700'
      ].join(' '),
      
      secondary: [
        'bg-gray-100 text-gray-900 shadow-sm',
        'hover:bg-gray-200 active:bg-gray-300',
        'focus:ring-gray-500',
        'dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700'
      ].join(' '),
      
      danger: [
        'bg-red-600 text-white shadow-sm',
        'hover:bg-red-700 active:bg-red-800',
        'focus:ring-red-500',
        'dark:bg-red-600 dark:hover:bg-red-700'
      ].join(' '),
      
      ghost: [
        'text-gray-700 hover:text-gray-900',
        'hover:bg-gray-100 active:bg-gray-200',
        'focus:ring-gray-500',
        'dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-800'
      ].join(' '),
      
      outline: [
        'border border-gray-300 bg-white text-gray-700 shadow-sm',
        'hover:bg-gray-50 active:bg-gray-100',
        'focus:ring-blue-500',
        'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300',
        'dark:hover:bg-gray-700'
      ].join(' ')
    };

    // 大小樣式
    const sizeStyles = {
      sm: 'h-8 px-3 text-sm gap-1.5',
      md: 'h-10 px-4 text-sm gap-2',
      lg: 'h-12 px-6 text-base gap-2.5'
    };

    // 圖標大小
    const iconSizes = {
      sm: 'h-3.5 w-3.5',
      md: 'h-4 w-4',
      lg: 'h-5 w-5'
    };

    // Loading 圖標
    const LoadingIcon = () => (
      <svg
        className={`animate-spin ${iconSizes[size]}`}
        fill="none"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          fill="currentColor"
        />
      </svg>
    );

    // 組合所有樣式
    const finalClassName = [
      baseStyles,
      variantStyles[variant],
      sizeStyles[size],
      className
    ].filter(Boolean).join(' ');

    // 渲染圖標
    const renderIcon = (iconElement: React.ReactNode) => {
      if (!iconElement) return null;
      
      return (
        <span className={iconSizes[size]}>
          {iconElement}
        </span>
      );
    };

    const content = (
      <>
        {loading && <LoadingIcon />}
        {!loading && icon && iconPosition === 'left' && renderIcon(icon)}
        {children && <span>{children}</span>}
        {!loading && icon && iconPosition === 'right' && renderIcon(icon)}
      </>
    );

    return (
      <button
        className={finalClassName}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button; 