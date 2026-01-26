import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina clases CSS con soporte para condicionales y merge de Tailwind.
 *
 * @example
 * cn('px-4 py-2', isActive && 'bg-primary-500', className)
 * cn('text-sm', { 'font-bold': isBold, 'text-red-500': hasError })
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
