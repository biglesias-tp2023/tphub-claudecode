import { cn } from '@/utils/cn';

interface AvatarInitialsProps {
  name: string | null | undefined;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'gray' | 'client';
  className?: string;
}

/**
 * Get initials from a name string
 */
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/**
 * Avatar component that shows image or falls back to initials
 */
export function AvatarInitials({
  name,
  avatarUrl,
  size = 'md',
  variant = 'primary',
  className,
}: AvatarInitialsProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
  };

  const variantClasses = {
    primary: 'bg-primary-100 text-primary-700',
    gray: 'bg-gray-100 text-gray-600',
    client: 'bg-amber-100 text-amber-700',
  };

  // If we have an avatar URL, show the image
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'Avatar'}
        className={cn(
          'rounded-full object-cover',
          sizeClasses[size],
          className
        )}
      />
    );
  }

  // Otherwise show initials
  const initials = name ? getInitials(name) : '?';

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-medium',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      title={name || undefined}
    >
      {initials}
    </div>
  );
}
