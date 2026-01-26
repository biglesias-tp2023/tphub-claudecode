import { forwardRef } from 'react';
import { cn } from '@/utils/cn';
import type { InputHTMLAttributes, ReactNode } from 'react';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Tamaño del input */
  size?: 'sm' | 'md' | 'lg';
  /** Estado de error */
  hasError?: boolean;
  /** Icono a la izquierda */
  leftIcon?: ReactNode;
  /** Icono a la derecha */
  rightIcon?: ReactNode;
  /** Label del input */
  label?: string;
  /** Mensaje de error */
  errorMessage?: string;
  /** Texto de ayuda */
  helperText?: string;
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-3 text-base',
};

const iconPaddingLeft = {
  sm: 'pl-9',
  md: 'pl-10',
  lg: 'pl-11',
};

const iconPaddingRight = {
  sm: 'pr-9',
  md: 'pr-10',
  lg: 'pr-11',
};

const iconPositionStyles = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-5 h-5',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = 'md',
      hasError = false,
      leftIcon,
      rightIcon,
      label,
      errorMessage,
      helperText,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const showError = hasError && errorMessage;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <span className={iconPositionStyles[size]}>{leftIcon}</span>
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={cn(
              // Base styles
              'w-full rounded-lg border bg-white',
              'placeholder:text-gray-400',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              // Size
              sizeStyles[size],
              // Icon padding
              leftIcon && iconPaddingLeft[size],
              rightIcon && iconPaddingRight[size],
              // States
              hasError
                ? 'border-error-500 focus:border-error-500 focus:ring-error-500/20'
                : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500/20',
              'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
              className
            )}
            {...props}
          />

          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
              <span className={iconPositionStyles[size]}>{rightIcon}</span>
            </div>
          )}
        </div>

        {(showError || helperText) && (
          <p
            className={cn(
              'mt-1.5 text-sm',
              showError ? 'text-error-500' : 'text-gray-500'
            )}
          >
            {showError ? errorMessage : helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
