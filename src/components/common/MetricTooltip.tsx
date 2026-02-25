import { useState, useRef, useEffect, type ReactNode } from 'react';
import { Info } from 'lucide-react';

interface MetricTooltipProps {
  content: ReactNode;
  children?: ReactNode;
}

/**
 * Helper to build standardized tooltip content with "Qué es", "Cálculo", "Por qué importa" blocks.
 */
export function tooltipContent(what: string, calc?: string, why?: string): ReactNode {
  return (
    <div className="space-y-2 text-xs">
      <div>
        <p className="font-semibold text-gray-700 mb-0.5">Qué es</p>
        <p className="text-gray-600">{what}</p>
      </div>
      {calc && (
        <div>
          <p className="font-semibold text-gray-700 mb-0.5">Cálculo</p>
          <p className="text-gray-600">{calc}</p>
        </div>
      )}
      {why && (
        <div>
          <p className="font-semibold text-gray-700 mb-0.5">Por qué importa</p>
          <p className="text-gray-600">{why}</p>
        </div>
      )}
    </div>
  );
}

export function MetricTooltip({ content, children }: MetricTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<'bottom' | 'top'>('bottom');
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setPosition(spaceBelow < 200 ? 'top' : 'bottom');
    }
  }, [isOpen]);

  return (
    <span
      ref={triggerRef}
      className="relative inline-flex cursor-help text-gray-300"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {children ?? <Info className="w-3.5 h-3.5" />}
      {isOpen && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 w-72 bg-white border border-gray-100 rounded-lg shadow-lg p-3 ${
            position === 'bottom' ? 'top-full mt-1.5' : 'bottom-full mb-1.5'
          } right-0`}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          {typeof content === 'string' ? (
            <p className="text-xs text-gray-600">{content}</p>
          ) : (
            content
          )}
        </div>
      )}
    </span>
  );
}
