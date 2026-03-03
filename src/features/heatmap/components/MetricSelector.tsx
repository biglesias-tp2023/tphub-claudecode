import { useState, useRef, useEffect } from 'react';
import { BarChart3, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { HeatmapMetric } from '../types';

const METRIC_OPTIONS: { value: HeatmapMetric; label: string }[] = [
  { value: 'revenue', label: 'Ventas' },
  { value: 'orders', label: '# Pedidos' },
  { value: 'avgTicket', label: 'Ticket Medio' },
  { value: 'newCustomers', label: 'Nuevos clientes' },
  { value: 'adSpent', label: 'Inversión Ads' },
  { value: 'promos', label: 'Inversión Promos' },
  { value: 'avgDeliveryTime', label: 'Tiempo de entrega' },
];

interface MetricSelectorProps {
  value: HeatmapMetric;
  onChange: (metric: HeatmapMetric) => void;
}

export function MetricSelector({ value, onChange }: MetricSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLabel = METRIC_OPTIONS.find((o) => o.value === value)?.label ?? '';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border bg-white',
          'text-sm font-medium transition-all duration-150',
          'border-gray-300 hover:border-gray-400',
          isOpen && 'border-primary-500 ring-2 ring-primary-500/20'
        )}
      >
        <BarChart3 className="w-4 h-4 text-gray-500" />
        <span className="text-gray-900">{selectedLabel}</span>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-gray-400 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 right-0 w-48 bg-white rounded-lg border border-gray-200 shadow-lg animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-900">Seleccionar métrica</h3>
          </div>
          <div className="p-1.5">
            {METRIC_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={cn(
                  'flex items-center justify-between w-full px-2.5 py-1.5 rounded-md text-sm transition-colors',
                  opt.value === value
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                {opt.label}
                {opt.value === value && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
