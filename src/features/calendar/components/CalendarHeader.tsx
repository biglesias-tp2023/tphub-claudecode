import { ChevronLeft, ChevronRight, Search, Settings, Share2 } from 'lucide-react';
import { cn } from '@/utils/cn';

export type CalendarViewType = 'day' | 'week' | 'month' | 'agenda' | '4days';

interface CalendarHeaderProps {
  year: number;
  month: number;
  day?: number;
  currentView: CalendarViewType;
  onPrevPeriod: () => void;
  onNextPeriod: () => void;
  onToday: () => void;
  onViewChange: (view: CalendarViewType) => void;
  onSearch?: () => void;
  onSettings?: () => void;
  onShare?: () => void;
  isClientMode?: boolean;
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const VIEW_OPTIONS: { id: CalendarViewType; label: string }[] = [
  { id: 'day', label: 'Día' },
  { id: '4days', label: '4 días' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
  { id: 'agenda', label: 'Agenda' },
];

function getWeekNumber(year: number, month: number, day: number): number {
  const d = new Date(Date.UTC(year, month - 1, day));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getDisplayTitle(view: CalendarViewType, year: number, month: number, day?: number): string {
  const monthName = MONTHS[month - 1];

  switch (view) {
    case 'day':
      return day ? `${day} de ${monthName} ${year}` : `${monthName} ${year}`;
    case '4days':
      return `${monthName} ${year}`;
    case 'week':
      if (day) {
        const weekNum = getWeekNumber(year, month, day);
        return `${monthName} ${year} · Semana ${weekNum}`;
      }
      return `${monthName} ${year}`;
    case 'month':
    case 'agenda':
      return `${monthName} ${year}`;
    default:
      return `${monthName} ${year}`;
  }
}

export function CalendarHeader({
  year,
  month,
  day,
  currentView,
  onPrevPeriod,
  onNextPeriod,
  onToday,
  onViewChange,
  onSearch,
  onSettings,
  onShare,
  isClientMode = false,
}: CalendarHeaderProps) {
  return (
    <div className="flex items-center justify-between h-14 px-4 border-b border-gray-200 bg-white">
      {/* Left section: Navigation */}
      <div className="flex items-center gap-3">
        {/* Today button */}
        <button
          onClick={onToday}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
            'border border-gray-300 text-gray-700',
            'hover:bg-gray-50 active:bg-gray-100'
          )}
        >
          Hoy
        </button>

        {/* Period navigation */}
        <div className="flex items-center">
          <button
            onClick={onPrevPeriod}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Periodo anterior"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={onNextPeriod}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Periodo siguiente"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Period title */}
        <h1 className="text-lg font-medium text-gray-900">
          {getDisplayTitle(currentView, year, month, day)}
        </h1>
      </div>

      {/* Right section: View selector and actions */}
      <div className="flex items-center gap-2">
        {/* View selector - segmented control style */}
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => onViewChange(option.id)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-all',
                currentView === option.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200 mx-1" />

        {/* Action icons */}
        {onShare && !isClientMode && (
          <button
            onClick={onShare}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            aria-label="Compartir"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Compartir</span>
          </button>
        )}

        {onSearch && (
          <button
            onClick={onSearch}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Buscar"
          >
            <Search className="w-5 h-5 text-gray-500" />
          </button>
        )}

        {onSettings && (
          <button
            onClick={onSettings}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Configuración"
          >
            <Settings className="w-5 h-5 text-gray-500" />
          </button>
        )}
      </div>
    </div>
  );
}
