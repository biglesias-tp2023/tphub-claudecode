/**
 * SharedObjectivePage
 *
 * Public page for viewing a shared objective.
 * Accessed via /shared/:token
 *
 * Features:
 * - No authentication required
 * - Shows objective with progress, health status
 * - Shows related tasks
 * - Tracks view count
 * - Respects expiration and email restrictions
 */

import { useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Clock,
  Calendar,
  Target,
  CheckCircle2,
  ArrowLeft,
  Shield,
  Building2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button, Card } from '@/components/ui';
import { ProgressCircle, getProgressCircleColor } from '@/features/strategic/components/ProgressCircle';
import { HealthBadge } from '@/features/strategic/components/HealthBadge';
import { TrendIndicator } from '@/features/strategic/components/TrendIndicator';
import { useShareLinkByToken, useRecordAccess } from '@/features/strategic/hooks/useShareLinks';
import { useObjectiveProgress } from '@/features/strategic/hooks/useObjectiveProgress';
import { fetchStrategicObjectiveById } from '@/services/supabase-data';
import { isShareLinkValid, isEmailAllowed } from '@/services/shareLinks';
import { formatKpiValue } from '@/features/strategic/hooks/useStrategicData';
import { getCategoryConfig } from '@/features/strategic/config';
import type { StrategicObjective, ObjectiveCategory } from '@/types';

// ============================================
// TYPES
// ============================================

interface ErrorStateProps {
  title: string;
  message: string;
  showHomeLink?: boolean;
}

// ============================================
// ERROR STATES
// ============================================

function ErrorState({ title, message, showHomeLink = true }: ErrorStateProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center p-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">{title}</h1>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        {showHomeLink && (
          <Link to="/">
            <Button variant="outline" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Ir al inicio
            </Button>
          </Link>
        )}
      </Card>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-4" />
        <p className="text-sm text-gray-500">Cargando objetivo...</p>
      </div>
    </div>
  );
}

// ============================================
// OBJECTIVE DISPLAY
// ============================================

interface ObjectiveDisplayProps {
  objective: StrategicObjective;
}

function ObjectiveDisplay({ objective }: ObjectiveDisplayProps) {
  const progress = useObjectiveProgress({ objective });
  const categoryConfig = getCategoryConfig(objective.category as ObjectiveCategory);

  const hasKpi = !!objective.kpiType && !!objective.kpiTargetValue;
  const circleColor = getProgressCircleColor(progress.healthStatus);

  // Days display
  const isOverdue = progress.daysRemaining < 0;
  const isUrgent = progress.daysRemaining >= 0 && progress.daysRemaining <= 7;

  function formatDaysRemaining(days: number): string {
    if (days < 0) return `${Math.abs(days)} días atrasado`;
    if (days === 0) return 'Vence hoy';
    if (days === 1) return 'Vence mañana';
    return `${days} días restantes`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-6">
        {/* Progress circle */}
        {hasKpi && !progress.isLoading && (
          <div className="flex-shrink-0">
            <ProgressCircle
              value={progress.progressPercentage}
              size={80}
              strokeWidth={6}
              color={circleColor}
            />
          </div>
        )}

        {/* Title and meta */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-xs font-medium',
                categoryConfig?.bgColor,
                categoryConfig?.textColor
              )}
            >
              {categoryConfig?.label || objective.category}
            </span>
            {hasKpi && !progress.isLoading && (
              <HealthBadge status={progress.healthStatus} size="md" />
            )}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {objective.title}
          </h1>

          {objective.description && (
            <p className="text-sm text-gray-600">{objective.description}</p>
          )}

          {/* Trend indicator */}
          {hasKpi && !progress.isLoading && progress.velocity !== null && (
            <div className="mt-3">
              <TrendIndicator
                trend={progress.trend}
                velocity={progress.velocity}
                unit={objective.kpiUnit || undefined}
                size="md"
              />
            </div>
          )}
        </div>
      </div>

      {/* KPI Details */}
      {hasKpi && !progress.isLoading && (
        <Card padding="md" className="bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Valor actual</p>
              <p className="text-lg font-semibold text-gray-900">
                {progress.currentValue !== null
                  ? formatKpiValue(progress.currentValue, objective.kpiUnit)
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Objetivo</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatKpiValue(objective.kpiTargetValue!, objective.kpiUnit)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Progreso</p>
              <p className="text-lg font-semibold text-gray-900">
                {progress.progressPercentage !== null
                  ? `${Math.round(progress.progressPercentage)}%`
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Proyección</p>
              <p
                className={cn(
                  'text-lg font-semibold',
                  progress.willComplete ? 'text-emerald-600' : 'text-amber-600'
                )}
              >
                {progress.projectedValue !== null
                  ? formatKpiValue(progress.projectedValue, objective.kpiUnit)
                  : '-'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Timeline info */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        {objective.evaluationDate && (
          <div
            className={cn(
              'flex items-center gap-2',
              isOverdue && 'text-red-600',
              isUrgent && !isOverdue && 'text-amber-600',
              !isOverdue && !isUrgent && 'text-gray-600'
            )}
          >
            <Clock className="w-4 h-4" />
            <span>{formatDaysRemaining(progress.daysRemaining)}</span>
          </div>
        )}

        {objective.evaluationDate && (
          <div className="flex items-center gap-2 text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>
              Fecha límite:{' '}
              {new Date(objective.evaluationDate).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 text-gray-500">
          <Target className="w-4 h-4" />
          <span>
            Horizonte:{' '}
            {objective.horizon === 'short'
              ? 'Corto plazo'
              : objective.horizon === 'medium'
                ? 'Medio plazo'
                : 'Largo plazo'}
          </span>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
            objective.status === 'completed' && 'bg-emerald-50 text-emerald-700',
            objective.status === 'in_progress' && 'bg-primary-50 text-primary-700',
            objective.status === 'pending' && 'bg-gray-100 text-gray-700'
          )}
        >
          {objective.status === 'completed' && <CheckCircle2 className="w-4 h-4" />}
          {objective.status === 'completed' && 'Completado'}
          {objective.status === 'in_progress' && 'En progreso'}
          {objective.status === 'pending' && 'Pendiente'}
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function SharedObjectivePage() {
  const { token } = useParams<{ token: string }>();
  const recordAccess = useRecordAccess();

  // Fetch share link
  const {
    data: shareLink,
    isLoading: isLoadingLink,
    error: linkError,
  } = useShareLinkByToken(token);

  // Fetch objective when we have a valid link
  const {
    data: objective,
    isLoading: isLoadingObjective,
    error: objectiveError,
  } = useQuery({
    queryKey: ['shared-objective', shareLink?.objectiveId],
    queryFn: () => fetchStrategicObjectiveById(shareLink!.objectiveId),
    enabled: !!shareLink?.objectiveId,
  });

  // Record access on mount
  useEffect(() => {
    if (token && shareLink?.isActive) {
      recordAccess.mutate(token);
    }
  }, [token, shareLink?.isActive]);

  // Validation
  const validation = useMemo(() => {
    if (!shareLink) return null;
    return isShareLinkValid(shareLink);
  }, [shareLink]);

  // Loading state
  if (isLoadingLink) {
    return <LoadingState />;
  }

  // Link not found
  if (linkError || !shareLink) {
    return (
      <ErrorState
        title="Enlace no encontrado"
        message="El enlace que buscas no existe o ha sido eliminado."
      />
    );
  }

  // Link validation failed
  if (validation && !validation.valid) {
    if (validation.reason === 'Link has expired') {
      return (
        <ErrorState
          title="Enlace expirado"
          message="Este enlace ha expirado y ya no está disponible."
        />
      );
    }
    if (validation.reason === 'Link is disabled') {
      return (
        <ErrorState
          title="Enlace desactivado"
          message="Este enlace ha sido desactivado temporalmente."
        />
      );
    }
  }

  // Loading objective
  if (isLoadingObjective) {
    return <LoadingState />;
  }

  // Objective not found
  if (objectiveError || !objective) {
    return (
      <ErrorState
        title="Objetivo no encontrado"
        message="No se pudo cargar el objetivo asociado a este enlace."
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header bar */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">TP</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">ThinkPaladar</p>
              <p className="text-xs text-gray-500">Objetivo compartido</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Shield className="w-3.5 h-3.5" />
            <span>Vista de solo lectura</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Card padding="lg">
          <ObjectiveDisplay objective={objective} />
        </Card>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Compartido mediante ThinkPaladar Portal
        </p>
      </main>
    </div>
  );
}
