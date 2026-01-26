import { Calendar, Gift, Trophy, Film, ShoppingCart } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { CalendarEvent, EventCategory } from '@/types';

interface EventsWidgetProps {
  events: CalendarEvent[];
  isLoading?: boolean;
}

const CATEGORY_CONFIG: Record<EventCategory, { icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string }> = {
  holiday: {
    icon: Gift,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  sports: {
    icon: Trophy,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  entertainment: {
    icon: Film,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  commercial: {
    icon: ShoppingCart,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
};

function EventItem({ event }: { event: CalendarEvent }) {
  const config = CATEGORY_CONFIG[event.category];
  const Icon = config.icon;

  const date = new Date(event.eventDate);
  const isToday = new Date().toISOString().split('T')[0] === event.eventDate;
  const isPast = new Date(event.eventDate) < new Date(new Date().toISOString().split('T')[0]);

  const formattedDate = date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-2 rounded-lg transition-colors',
        isToday && 'bg-amber-50 ring-1 ring-amber-200',
        isPast && 'opacity-50'
      )}
    >
      <div className={cn('p-1.5 rounded', config.bgColor)}>
        <Icon className={cn('w-4 h-4', config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-medium text-gray-900 truncate',
          isPast && 'line-through'
        )}>
          {event.name}
        </p>
        <p className="text-xs text-gray-500">{formattedDate}</p>
      </div>
      {isToday && (
        <span className="px-2 py-0.5 text-xs font-medium text-amber-700 bg-amber-100 rounded-full">
          Hoy
        </span>
      )}
    </div>
  );
}

export function EventsWidget({ events, isLoading }: EventsWidgetProps) {
  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-700">Eventos</h3>
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-700">Eventos</h3>
        </div>
        <p className="text-sm text-gray-500">No hay eventos proximos</p>
      </div>
    );
  }

  // Sort by date and filter to upcoming only
  const today = new Date().toISOString().split('T')[0];
  const sortedEvents = [...events]
    .filter(e => e.eventDate >= today)
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
    .slice(0, 8);

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4 text-primary-500" />
        <h3 className="text-sm font-medium text-gray-700">Proximos Eventos</h3>
      </div>

      <div className="space-y-1">
        {sortedEvents.map(event => (
          <EventItem key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
