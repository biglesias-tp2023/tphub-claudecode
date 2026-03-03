import { useState, useRef, useLayoutEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

interface MetricTooltipProps {
  content: ReactNode;
  children?: ReactNode;
}

const TOOLTIP_WIDTH = 288; // w-72 = 18rem = 288px
const GAP = 6; // gap between trigger and tooltip

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
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    // Vertical: prefer below, flip above if not enough space
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < 200
      ? rect.top + window.scrollY - GAP // above — adjusted after measuring
      : rect.bottom + window.scrollY + GAP;

    // Horizontal: center on trigger, clamp to viewport
    let left = rect.left + window.scrollX + rect.width / 2 - TOOLTIP_WIDTH / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - TOOLTIP_WIDTH - 8));

    setCoords({ top, left });
  }, [isOpen]);

  // Adjust upward placement after the tooltip renders (we need its actual height)
  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current || !tooltipRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < 200) {
      const tooltipHeight = tooltipRef.current.offsetHeight;
      setCoords((prev) => ({
        ...prev,
        top: rect.top + window.scrollY - tooltipHeight - GAP,
      }));
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
      {isOpen &&
        createPortal(
          <div
            ref={tooltipRef}
            style={{ position: 'absolute', top: coords.top, left: coords.left, width: TOOLTIP_WIDTH }}
            className="z-50 bg-white border border-gray-100 rounded-lg shadow-lg p-3"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
          >
            {typeof content === 'string' ? (
              <p className="text-xs text-gray-600">{content}</p>
            ) : (
              content
            )}
          </div>,
          document.body
        )}
    </span>
  );
}
