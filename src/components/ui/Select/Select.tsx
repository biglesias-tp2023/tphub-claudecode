import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { SelectHTMLAttributes, ReactNode } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /** Opciones del select */
  options: SelectOption[];
  /** Tamaño del select */
  size?: 'sm' | 'md' | 'lg';
  /** Estado de error */
  hasError?: boolean;
  /** Label del select */
  label?: string;
  /** Placeholder */
  placeholder?: string;
  /** Mensaje de error */
  errorMessage?: string;
  /** Texto de ayuda */
  helperText?: string;
  /** Icono a la izquierda */
  leftIcon?: ReactNode;
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm pr-8',
  md: 'px-3 py-2 text-sm pr-9',
  lg: 'px-4 py-3 text-base pr-10',
};

const iconPaddingLeft = {
  sm: 'pl-9',
  md: 'pl-10',
  lg: 'pl-11',
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      options,
      size = 'md',
      hasError = false,
      label,
      placeholder,
      errorMessage,
      helperText,
      leftIcon,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const showError = hasError && errorMessage;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              {leftIcon}
            </div>
          )}

          <select
            ref={ref}
            id={selectId}
            className={cn(
              // Base styles
              'w-full rounded-lg border bg-white appearance-none cursor-pointer',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              // Size
              sizeStyles[size],
              // Icon padding
              leftIcon && iconPaddingLeft[size],
              // States
              hasError
                ? 'border-error-500 focus:border-error-500 focus:ring-error-500/20'
                : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500/20',
              'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>

          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
            <ChevronDown className="w-4 h-4" />
          </div>
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

Select.displayName = 'Select';
