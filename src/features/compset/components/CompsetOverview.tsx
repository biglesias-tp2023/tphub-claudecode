import { Clock, Receipt, Star, Tag } from 'lucide-react';
import { KpiComparisonCard } from './KpiComparisonCard';
import { ComparisonTable } from './ComparisonTable';
import type { CompetitorWithData, CompsetAverage } from '../types';

interface CompsetOverviewProps {
  hero: CompetitorWithData | null;
  competitors: CompetitorWithData[];
  compsetAvg: CompsetAverage;
}

export function CompsetOverview({ hero, competitors, compsetAvg }: CompsetOverviewProps) {
  const heroSnap = hero?.snapshot;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiComparisonCard
          label="Tiempo entrega"
          heroValue={heroSnap?.deliveryTimeMin ?? null}
          compsetAvg={compsetAvg.deliveryTimeMin}
          format="minutes"
          lowerIsBetter
          icon={Clock}
        />
        <KpiComparisonCard
          label="Ticket medio"
          heroValue={heroSnap?.avgTicket ?? null}
          compsetAvg={compsetAvg.avgTicket}
          format="currency"
          icon={Receipt}
        />
        <KpiComparisonCard
          label="Rating"
          heroValue={heroSnap?.rating ?? null}
          compsetAvg={compsetAvg.rating}
          format="rating"
          icon={Star}
        />
        <KpiComparisonCard
          label="Promos activas"
          heroValue={heroSnap?.activePromoCount ?? null}
          compsetAvg={compsetAvg.activePromoCount}
          format="count"
          icon={Tag}
        />
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Comparativa completa</h3>
        </div>
        <ComparisonTable
          hero={hero}
          competitors={competitors}
          compsetAvg={compsetAvg}
        />
      </div>
    </div>
  );
}
