import { useState, useRef, useEffect, useCallback } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/utils/cn';
import { PresetList } from './PresetList';
import { CustomCalendar } from './CustomCalendar';
import { getPresetLabel, getRangeFromPreset } from './presets';
import type { DatePresetId } from './types';
import type { DateRange } from '@/types';

interface DateRangePickerProps {
  value: DateRange;
  presetId: DatePresetId;
  onChange: (range: DateRange, presetId: DatePresetId) => void;
  className?: string;
}

export function DateRangePicker({
  value,
  presetId,
  onChange,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [tempPresetId, setTempPresetId] = useState<DatePresetId>(presetId);
  const [tempCustomRange, setTempCustomRange] = useState<DateRange | null>(
    presetId === 'custom' ? value : null
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowCalendar(false);
        // Reset temp values
        setTempPresetId(presetId);
        setTempCustomRange(presetId === 'custom' ? value : null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [presetId, value]);

  // Format display label
  const getDisplayLabel = useCallback((): string => {
    if (presetId === 'custom') {
      return `${format(value.start, "dd MMM yy", { locale: es })} - ${format(value.end, "dd MMM yy", { locale: es })}`;
    }
    return getPresetLabel(presetId);
  }, [presetId, value]);

  // Handle preset selection
  const handlePresetChange = (newPresetId: DatePresetId) => {
    if (import.meta.env.DEV) {
      console.log('[DateRangePicker] Preset selected:', newPresetId);
    }

    setTempPresetId(newPresetId);

    if (newPresetId === 'custom') {
      // Show calendar for custom selection
      if (import.meta.env.DEV) {
        console.log('[DateRangePicker] Showing calendar for custom range');
      }
      setShowCalendar(true);
      setTempCustomRange(value);
    } else {
      // Apply preset immediately
      const newRange = getRangeFromPreset(newPresetId);
      onChange(newRange, newPresetId);
      setIsOpen(false);
      setShowCalendar(false);
    }
  };

  // Handle custom range cancel
  const handleCalendarCancel = () => {
    setShowCalendar(false);
    setTempPresetId(presetId);
    setTempCustomRange(presetId === 'custom' ? value : null);
  };

  // Handle custom range apply
  const handleCalendarApply = () => {
    if (tempCustomRange) {
      onChange(tempCustomRange, 'custom');
      setIsOpen(false);
      setShowCalendar(false);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger button */}
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
        <Calendar className="w-4 h-4 text-gray-500" />
        <span className="text-gray-900">{getDisplayLabel()}</span>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-gray-400 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg',
            'animate-in fade-in zoom-in-95 duration-150',
            // Position from the right edge, constrain to viewport
            'right-0 max-w-[calc(100vw-2rem)]',
            showCalendar ? 'w-auto' : 'w-48'
          )}
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-900">
              Seleccionar período
            </h3>
          </div>

          {/* Presets list */}
          <div className="p-1.5">
            <PresetList
              value={tempPresetId}
              onChange={handlePresetChange}
            />
          </div>

          {/* Custom calendar (only shown when "Personalizar" is selected) */}
          {showCalendar && (
            <CustomCalendar
              value={tempCustomRange}
              onChange={setTempCustomRange}
              onCancel={handleCalendarCancel}
              onApply={handleCalendarApply}
            />
          )}
        </div>
      )}
    </div>
  );
}
