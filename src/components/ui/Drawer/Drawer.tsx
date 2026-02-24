import { useEffect, useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '../Button';
import type { ReactNode, MouseEvent } from 'react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
  /** Custom header content. When provided, replaces the default title/description header. */
  header?: ReactNode;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  width,
  header,
}: DrawerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // Animate in/out
  useEffect(() => {
    if (isOpen) {
      // Mount then animate in on next frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  // Handle Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  // Handle overlay click
  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  // Add/remove event listeners and body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className={cn(
        'fixed inset-0 z-50',
        'transition-colors duration-300',
        visible ? 'bg-black/50 backdrop-blur-sm' : 'bg-transparent'
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'drawer-title' : undefined}
      aria-describedby={description ? 'drawer-description' : undefined}
    >
      <div
        className={cn(
          'fixed right-0 top-0 h-full max-sm:w-full',
          !width && 'w-[480px]',
          'bg-white border-l border-gray-100 shadow-xl',
          'flex flex-col',
          'transition-all duration-300 ease-out',
          visible ? 'translate-x-0' : 'translate-x-full'
        )}
        style={width ? { width } : undefined}
      >
        {/* Header */}
        {header ? (
          <div className="flex items-start justify-between p-4 border-b border-gray-100 shrink-0">
            <div className="min-w-0 flex-1">{header}</div>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              onClick={onClose}
              aria-label="Cerrar drawer"
              className="ml-2"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-start justify-between p-4 border-b border-gray-100 shrink-0">
            <div className="min-w-0">
              {title && (
                <h2
                  id="drawer-title"
                  className="text-lg font-semibold text-gray-900"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p
                  id="drawer-description"
                  className="mt-1 text-sm text-gray-500"
                >
                  {description}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              onClick={onClose}
              aria-label="Cerrar drawer"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
