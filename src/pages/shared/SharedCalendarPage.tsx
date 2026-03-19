/**
 * Shared Calendar Page
 *
 * Public page for viewing a shared calendar.
 * Accessed via /shared/calendar/:token
 *
 * No authentication required — uses the share link token to fetch config.
 */

import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertCircle, Calendar, Clock, Loader2, Shield } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { CalendarView } from '@/features/calendar/components/CalendarView';
import {
  useCalendarShareLinkByToken,
  useCampaignsByMonth,
  useCalendarEventsByMonth,
} from '@/features/calendar';
import { isCalendarShareLinkValid } from '@/services/calendarShareLinks';
import type { CalendarShareLink } from '@/services/calendarShareLinks';

// ============================================
// ERROR STATES
// ============================================

function ErrorState({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-500 mb-6">{message}</p>
        <Link to="/login">
          <Button variant="outline">Ir a ThinkPaladar</Button>
        </Link>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Cargando calendario...</p>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function SharedCalendarPage() {
  const { token } = useParams<{ token: string }>();

  const { data: shareLink, isLoading, error } = useCalendarShareLinkByToken(token);

  if (isLoading) return <LoadingState />;

  if (error || !shareLink) {
    return (
      <ErrorState
        title="Enlace no encontrado"
        message="Este enlace de calendario no existe o ha sido eliminado."
      />
    );
  }

  if (!isCalendarShareLinkValid(shareLink)) {
    if (shareLink.expiresAt && new Date(shareLink.expiresAt) < new Date()) {
      return (
        <ErrorState
          title="Enlace expirado"
          message="Este enlace de calendario ha expirado. Solicita un nuevo enlace al consultor."
        />
      );
    }
    return (
      <ErrorState
        title="Enlace desactivado"
        message="Este enlace de calendario ha sido desactivado."
      />
    );
  }

  return <SharedCalendarContent shareLink={shareLink} />;
}

// ============================================
// CONTENT (when link is valid)
// ============================================

function SharedCalendarContent({ shareLink }: { shareLink: CalendarShareLink }) {
  const config = shareLink.config;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Determine restaurant IDs from config
  const restaurantIds = useMemo(() => {
    return config.addressIds ?? config.brandIds ?? config.companyIds ?? [];
  }, [config]);

  // Fetch campaigns
  const { data: campaigns = [] } = useCampaignsByMonth(
    restaurantIds.length > 0 ? restaurantIds : ['all'],
    year,
    month
  );

  // Fetch events
  const { data: events = [] } = useCalendarEventsByMonth(
    year,
    month,
    config.region?.startsWith('ES-') ? 'ES' : config.region ?? 'ES'
  );

  // Filter campaigns by platform if configured
  const filteredCampaigns = useMemo(() => {
    if (!config.platformFilters?.length) return campaigns;
    return campaigns.filter(c => config.platformFilters!.includes(c.platform));
  }, [campaigns, config.platformFilters]);

  // Filter events by category if configured
  const filteredEvents = useMemo(() => {
    if (!config.categoryFilters?.length) return events;
    return events.filter(e => config.categoryFilters!.includes(e.category));
  }, [events, config.categoryFilters]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Calendario de Campañas</h1>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Vista de solo lectura · ThinkPaladar
              </p>
            </div>
          </div>
          {shareLink.expiresAt && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              Expira: {new Date(shareLink.expiresAt).toLocaleDateString('es-ES')}
            </div>
          )}
        </div>
      </header>

      {/* Calendar */}
      <main className="max-w-7xl mx-auto p-6">
        <Card className="overflow-hidden" style={{ height: 'calc(100vh - 140px)' }}>
          <CalendarView
            campaigns={filteredCampaigns}
            events={filteredEvents}
            isClientMode={true}
            onNewCampaign={() => {}}
            onCampaignClick={() => {}}
          />
        </Card>
      </main>
    </div>
  );
}
