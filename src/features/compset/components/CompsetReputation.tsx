import { Star } from 'lucide-react';
import { RatingScatterPlot } from './RatingScatterPlot';
import { PLATFORM_LABELS } from '../config';
import { cn } from '@/utils/cn';
import type { CompetitorWithData } from '../types';

interface CompsetReputationProps {
  hero: CompetitorWithData | null;
  competitors: CompetitorWithData[];
}

export function CompsetReputation({ hero, competitors }: CompsetReputationProps) {
  const all = hero ? [hero, ...competitors] : competitors;

  return (
    <div className="space-y-6">
      {/* Scatter plot */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">Rating vs Reviews</h3>
        </div>
        <div className="h-80">
          <RatingScatterPlot hero={hero} competitors={competitors} />
        </div>
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-gray-100">
          {hero && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-3 h-3 rounded-full bg-primary-600" />
              <span className="font-medium">{hero.competitor.name}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <div className="w-3 h-3 rounded-full" style={{ background: '#FFC244' }} />
            <span>Glovo</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <div className="w-3 h-3 rounded-full" style={{ background: '#06C167' }} />
            <span>UberEats</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <div className="w-3 h-3 rounded-full" style={{ background: '#FF8000' }} />
            <span>JustEat</span>
          </div>
        </div>
      </div>

      {/* Summary table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Resumen de reputación</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Competidor</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Plataforma</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Rating</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Reviews</th>
              </tr>
            </thead>
            <tbody>
              {all
                .sort((a, b) => (b.snapshot?.rating ?? 0) - (a.snapshot?.rating ?? 0))
                .map((c, idx) => (
                  <tr
                    key={c.competitor.id}
                    className={cn(
                      'border-b border-gray-50',
                      c.competitor.id === hero?.competitor.id && 'bg-primary-50/40 font-semibold'
                    )}
                  >
                    <td className="py-2.5 px-4">
                      <span className="text-gray-400 mr-2">{idx + 1}.</span>
                      {c.competitor.name}
                    </td>
                    <td className="py-2.5 px-4 text-gray-500">
                      {PLATFORM_LABELS[c.competitor.platform]}
                    </td>
                    <td className="text-right py-2.5 px-4">
                      <span className="inline-flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        {c.snapshot?.rating?.toFixed(2) ?? '—'}
                      </span>
                    </td>
                    <td className="text-right py-2.5 px-4 text-gray-600">
                      {c.snapshot?.reviewCount?.toLocaleString() ?? '—'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
