import { forwardRef } from 'react';
import { cn } from '@/utils/cn';
import { Spinner } from '../Spinner';
import type { ButtonProps } from './Button.types';

const variantStyles = {
  primary: [
    'bg-gradient-to-b from-primary-500 to-primary-600 text-white',
    'shadow-sm shadow-primary-600/25',
    'hover:from-primary-600 hover:to-primary-700',
    'active:from-primary-700 active:to-primary-800',
  ].join(' '),
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300',
  outline: 'border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50 active:bg-gray-100',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200',
  danger: [
    'bg-gradient-to-b from-error-500 to-error-600 text-white',
    'shadow-sm shadow-error-600/25',
    'hover:from-error-600 hover:to-error-700',
    'active:from-error-700 active:to-error-800',
  ].join(' '),
  success: [
    'bg-gradient-to-b from-success-500 to-success-600 text-white',
    'shadow-sm shadow-success-600/25',
    'hover:from-success-600 hover:to-success-700',
    'active:from-success-700 active:to-success-800',
  ].join(' '),
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2.5',
};

const iconSizeStyles = {
  sm: 'p-1.5',
  md: 'p-2',
  lg: 'p-3',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      isDisabled = false,
      leftIcon,
      rightIcon,
      iconOnly = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const disabled = isDisabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center font-medium rounded-lg',
          'transition-all duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          // Variant
          variantStyles[variant],
          // Size
          iconOnly ? iconSizeStyles[size] : sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <Spinner size={size === 'lg' ? 'md' : 'sm'} className="text-current" />
            {!iconOnly && <span className="opacity-0">{children}</span>}
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {!iconOnly && children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
