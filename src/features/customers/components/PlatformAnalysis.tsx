import { ArrowRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatNumber } from '@/utils/formatters';
import type { MultiPlatformAnalysis } from '@/services/crp-portal';
import type { ChannelId } from '@/types';

interface PlatformAnalysisProps {
  data: MultiPlatformAnalysis;
}

const CHANNEL_COLORS: Record<ChannelId, { bg: string; border: string; text: string }> = {
  glovo: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  ubereats: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  justeat: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
};

const CHANNEL_NAMES: Record<ChannelId, string> = {
  glovo: 'Glovo',
  ubereats: 'Uber Eats',
  justeat: 'Just Eat',
};

export function PlatformAnalysis({ data }: PlatformAnalysisProps) {
  const totalCustomers = data.glovoOnly + data.ubereatsOnly + data.justeatOnly + data.multiPlatform;

  if (totalCustomers === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="text-center text-gray-500 py-8">
          No hay datos de análisis multi-plataforma
        </div>
      </div>
    );
  }

  const platforms = [
    { id: 'glovo' as ChannelId, label: 'Solo Glovo', count: data.glovoOnly },
    { id: 'ubereats' as ChannelId, label: 'Solo Uber Eats', count: data.ubereatsOnly },
    { id: 'justeat' as ChannelId, label: 'Solo Just Eat', count: data.justeatOnly },
  ].filter((p) => p.count > 0);

  return (
    <div className="bg-white rounded-xl border border-gray-100">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Análisis Multi-Plataforma</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Clientes por plataforma y transiciones entre ellas
        </p>
      </div>

      <div className="p-5">
        {/* Platform Distribution */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {platforms.map((platform) => {
            const colors = CHANNEL_COLORS[platform.id];
            const percentage = totalCustomers > 0 ? (platform.count / totalCustomers) * 100 : 0;

            return (
              <div
                key={platform.id}
                className={cn('rounded-lg border p-4', colors.bg, colors.border)}
              >
                <p className="text-xs text-gray-500 mb-1">{platform.label}</p>
                <p className={cn('text-xl font-bold tabular-nums', colors.text)}>
                  {formatNumber(platform.count)}
                </p>
                <p className="text-xs text-gray-400 tabular-nums">{percentage.toFixed(1)}%</p>
              </div>
            );
          })}

          {/* Multi-platform card */}
          <div className="rounded-lg border border-primary-200 bg-primary-50 p-4">
            <p className="text-xs text-gray-500 mb-1">Multi-plataforma</p>
            <p className="text-xl font-bold text-primary-700 tabular-nums">
              {formatNumber(data.multiPlatform)}
            </p>
            <p className="text-xs text-primary-600 font-medium tabular-nums">
              {data.multiPlatformPercentage.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Transitions */}
        {data.transitions.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
              Transiciones entre Plataformas
            </h4>
            <div className="space-y-2">
              {data.transitions.slice(0, 6).map((transition, index) => {
                const fromColors = CHANNEL_COLORS[transition.from];
                const toColors = CHANNEL_COLORS[transition.to];

                return (
                  <div
                    key={`${transition.from}-${transition.to}-${index}`}
                    className="flex items-center gap-3 p-2 rounded-lg bg-gray-50"
                  >
                    <span className={cn(
                      'px-2 py-0.5 rounded text-xs font-medium',
                      fromColors.bg,
                      fromColors.text
                    )}>
                      {CHANNEL_NAMES[transition.from]}
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                    <span className={cn(
                      'px-2 py-0.5 rounded text-xs font-medium',
                      toColors.bg,
                      toColors.text
                    )}>
                      {CHANNEL_NAMES[transition.to]}
                    </span>
                    <span className="ml-auto text-sm font-semibold text-gray-900 tabular-nums">
                      {formatNumber(transition.count)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
