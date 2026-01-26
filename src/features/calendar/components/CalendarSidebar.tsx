import { useState, useMemo } from 'react';
import { Plus, ChevronLeft, ChevronRight, ChevronDown, Calendar, Flag, Trophy, Tv, ShoppingBag, MapPin } from 'lucide-react';
import { cn } from '@/utils/cn';
import { PLATFORMS } from '../config/platforms';
import type { CampaignPlatform, EventCategory } from '@/types';

interface CalendarSidebarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onCreateClick: () => void;
  selectedPlatforms: CampaignPlatform[];
  onPlatformsChange: (platforms: CampaignPlatform[]) => void;
  selectedStatuses: string[];
  onStatusesChange: (statuses: string[]) => void;
  selectedEventCategories: EventCategory[];
  onEventCategoriesChange: (categories: EventCategory[]) => void;
  selectedRegion: string;
  onRegionChange: (region: string) => void;
}

const STATUSES = [
  { id: 'scheduled', label: 'Programada', color: 'bg-blue-100 border-blue-300' },
  { id: 'active', label: 'Activa', color: 'bg-green-100 border-green-300' },
  { id: 'completed', label: 'Finalizada', color: 'bg-gray-100 border-gray-300' },
  { id: 'cancelled', label: 'Cancelada', color: 'bg-red-100 border-red-300' },
];

const EVENT_CATEGORIES: { id: EventCategory; label: string; icon: typeof Flag; color: string }[] = [
  { id: 'holiday', label: 'Festivos', icon: Flag, color: 'text-red-500' },
  { id: 'sports', label: 'Deportes', icon: Trophy, color: 'text-green-500' },
  { id: 'entertainment', label: 'Entretenimiento', icon: Tv, color: 'text-purple-500' },
  { id: 'commercial', label: 'Comercial', icon: ShoppingBag, color: 'text-amber-500' },
];

const SPANISH_REGIONS = [
  { id: 'ES', label: 'Nacional (España)' },
  { id: 'ES-AN', label: 'Andalucía' },
  { id: 'ES-AR', label: 'Aragón' },
  { id: 'ES-AS', label: 'Asturias' },
  { id: 'ES-IB', label: 'Islas Baleares' },
  { id: 'ES-CN', label: 'Canarias' },
  { id: 'ES-CB', label: 'Cantabria' },
  { id: 'ES-CL', label: 'Castilla y León' },
  { id: 'ES-CM', label: 'Castilla-La Mancha' },
  { id: 'ES-CT', label: 'Cataluña' },
  { id: 'ES-EX', label: 'Extremadura' },
  { id: 'ES-GA', label: 'Galicia' },
  { id: 'ES-MD', label: 'Madrid' },
  { id: 'ES-MC', label: 'Murcia' },
  { id: 'ES-NC', label: 'Navarra' },
  { id: 'ES-PV', label: 'País Vasco' },
  { id: 'ES-RI', label: 'La Rioja' },
  { id: 'ES-VC', label: 'Comunidad Valenciana' },
];

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function CalendarSidebar({
  selectedDate,
  onDateSelect,
  onCreateClick,
  selectedPlatforms,
  onPlatformsChange,
  selectedStatuses,
  onStatusesChange,
  selectedEventCategories,
  onEventCategoriesChange,
  selectedRegion,
  onRegionChange,
}: CalendarSidebarProps) {
  const [miniCalendarDate, setMiniCalendarDate] = useState(selectedDate);
  const [expandedSections, setExpandedSections] = useState({
    events: true,
    platforms: true,
    status: false,
  });

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const miniCalendarDays = useMemo(() => {
    const year = miniCalendarDate.getFullYear();
    const month = miniCalendarDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Adjust for Monday start
    let startDay = firstDay.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1;

    const days: { date: Date; isCurrentMonth: boolean; isToday: boolean; isSelected: boolean; isPast: boolean }[] = [];

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0);
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay.getDate() - i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: date.getTime() === today.getTime(),
        isSelected: date.toDateString() === selectedDate.toDateString(),
        isPast: date < today,
      });
    }

    // Current month days
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        isSelected: date.toDateString() === selectedDate.toDateString(),
        isPast: date < today,
      });
    }

    // Next month days (to complete 6 rows)
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: date.getTime() === today.getTime(),
        isSelected: date.toDateString() === selectedDate.toDateString(),
        isPast: date < today,
      });
    }

    return days;
  }, [miniCalendarDate, selectedDate, today]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const togglePlatform = (platformId: CampaignPlatform) => {
    if (selectedPlatforms.includes(platformId)) {
      onPlatformsChange(selectedPlatforms.filter(p => p !== platformId));
    } else {
      onPlatformsChange([...selectedPlatforms, platformId]);
    }
  };

  const toggleStatus = (statusId: string) => {
    if (selectedStatuses.includes(statusId)) {
      onStatusesChange(selectedStatuses.filter(s => s !== statusId));
    } else {
      onStatusesChange([...selectedStatuses, statusId]);
    }
  };

  const toggleEventCategory = (categoryId: EventCategory) => {
    if (selectedEventCategories.includes(categoryId)) {
      onEventCategoriesChange(selectedEventCategories.filter(c => c !== categoryId));
    } else {
      onEventCategoriesChange([...selectedEventCategories, categoryId]);
    }
  };

  return (
    <aside className="w-64 border-r border-gray-200 bg-white flex flex-col h-full">
      {/* CTA Principal */}
      <div className="p-4">
        <button
          onClick={onCreateClick}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-3',
            'bg-primary-600 text-white rounded-lg font-medium',
            'hover:bg-primary-700 active:bg-primary-800 transition-colors',
            'shadow-sm'
          )}
        >
          <Plus className="w-5 h-5" />
          Crear
        </button>
      </div>

      {/* Mini Calendar */}
      <div className="px-4 pb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          {/* Mini calendar header */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setMiniCalendarDate(new Date(miniCalendarDate.getFullYear(), miniCalendarDate.getMonth() - 1))}
              className="p-1 rounded hover:bg-gray-200 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-sm font-medium text-gray-900">
              {MONTHS[miniCalendarDate.getMonth()]} {miniCalendarDate.getFullYear()}
            </span>
            <button
              onClick={() => setMiniCalendarDate(new Date(miniCalendarDate.getFullYear(), miniCalendarDate.getMonth() + 1))}
              className="p-1 rounded hover:bg-gray-200 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-0.5">
            {miniCalendarDays.map((day, index) => (
              <button
                key={index}
                onClick={() => onDateSelect(day.date)}
                className={cn(
                  'aspect-square flex items-center justify-center text-xs rounded-full transition-colors',
                  !day.isCurrentMonth && 'text-gray-400',
                  day.isCurrentMonth && !day.isPast && 'text-gray-900',
                  day.isCurrentMonth && day.isPast && 'text-gray-400',
                  day.isToday && 'bg-gray-900 text-white font-medium',
                  day.isSelected && !day.isToday && 'bg-primary-100 text-primary-700 font-medium',
                  !day.isToday && !day.isSelected && 'hover:bg-gray-200'
                )}
              >
                {day.date.getDate()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        {/* Events calendar filter */}
        <div>
          <button
            onClick={() => toggleSection('events')}
            className="w-full flex items-center justify-between py-2 text-sm font-medium text-gray-700"
          >
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Calendario de eventos
            </span>
            <ChevronDown className={cn(
              'w-4 h-4 text-gray-400 transition-transform',
              expandedSections.events && 'rotate-180'
            )} />
          </button>
          {expandedSections.events && (
            <div className="space-y-3 mt-2">
              {/* Region selector */}
              <div className="flex items-center gap-2 px-2">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                <select
                  value={selectedRegion}
                  onChange={(e) => onRegionChange(e.target.value)}
                  className="flex-1 text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {SPANISH_REGIONS.map(region => (
                    <option key={region.id} value={region.id}>{region.label}</option>
                  ))}
                </select>
              </div>

              {/* Event categories */}
              <div className="space-y-1">
                {EVENT_CATEGORIES.map(category => {
                  const Icon = category.icon;
                  return (
                    <label
                      key={category.id}
                      className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEventCategories.includes(category.id)}
                        onChange={() => toggleEventCategory(category.id)}
                        className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                      />
                      <Icon className={cn('w-4 h-4', category.color)} />
                      <span className="text-sm text-gray-700">{category.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Platforms filter */}
        <div>
          <button
            onClick={() => toggleSection('platforms')}
            className="w-full flex items-center justify-between py-2 text-sm font-medium text-gray-700"
          >
            <span>Plataformas</span>
            <ChevronDown className={cn(
              'w-4 h-4 text-gray-400 transition-transform',
              expandedSections.platforms && 'rotate-180'
            )} />
          </button>
          {expandedSections.platforms && (
            <div className="space-y-1 mt-1">
              {Object.values(PLATFORMS).map(platform => (
                <label
                  key={platform.id}
                  className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedPlatforms.includes(platform.id)}
                    onChange={() => togglePlatform(platform.id)}
                    className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                  />
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: platform.color }}
                  />
                  <span className="text-sm text-gray-700">{platform.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Status filter */}
        <div>
          <button
            onClick={() => toggleSection('status')}
            className="w-full flex items-center justify-between py-2 text-sm font-medium text-gray-700"
          >
            <span>Estado</span>
            <ChevronDown className={cn(
              'w-4 h-4 text-gray-400 transition-transform',
              expandedSections.status && 'rotate-180'
            )} />
          </button>
          {expandedSections.status && (
            <div className="space-y-1 mt-1">
              {STATUSES.map(status => (
                <label
                  key={status.id}
                  className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedStatuses.includes(status.id)}
                    onChange={() => toggleStatus(status.id)}
                    className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                  />
                  <div className={cn('w-3 h-3 rounded-sm border', status.color)} />
                  <span className="text-sm text-gray-700">{status.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
