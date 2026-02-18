import { cn } from '@/utils/cn';
import type { CompetitorWithData, CompsetAverage } from '../types';
import { PLATFORM_LABELS } from '../config';

interface ComparisonTableProps {
  hero: CompetitorWithData | null;
  competitors: CompetitorWithData[];
  compsetAvg: CompsetAverage;
}

interface RowDef {
  label: string;
  getValue: (data: CompetitorWithData) => string;
  getAvgValue: (avg: CompsetAverage) => string;
}

const rows: RowDef[] = [
  {
    label: 'Rating',
    getValue: (d) => d.snapshot?.rating?.toFixed(2) ?? '—',
    getAvgValue: (a) => a.rating?.toFixed(2) ?? '—',
  },
  {
    label: 'Reviews',
    getValue: (d) => d.snapshot?.reviewCount?.toLocaleString() ?? '—',
    getAvgValue: (a) => Math.round(a.reviewCount ?? 0).toLocaleString() || '—',
  },
  {
    label: 'Ticket medio',
    getValue: (d) => d.snapshot?.avgTicket ? `${d.snapshot.avgTicket.toFixed(2)} €` : '—',
    getAvgValue: (a) => a.avgTicket ? `${a.avgTicket.toFixed(2)} €` : '—',
  },
  {
    label: 'Delivery fee',
    getValue: (d) => d.snapshot?.deliveryFee ? `${d.snapshot.deliveryFee.toFixed(2)} €` : '—',
    getAvgValue: (a) => a.deliveryFee ? `${a.deliveryFee.toFixed(2)} €` : '—',
  },
  {
    label: 'Service fee',
    getValue: (d) => d.snapshot?.serviceFee ? `${d.snapshot.serviceFee.toFixed(2)} €` : '—',
    getAvgValue: (a) => a.serviceFee ? `${a.serviceFee.toFixed(2)} €` : '—',
  },
  {
    label: 'Productos',
    getValue: (d) => d.snapshot?.totalProducts?.toString() ?? '—',
    getAvgValue: (a) => a.totalProducts ? Math.round(a.totalProducts).toString() : '—',
  },
  {
    label: 'Categorías',
    getValue: (d) => d.snapshot?.totalCategories?.toString() ?? '—',
    getAvgValue: (a) => a.totalCategories ? Math.round(a.totalCategories).toString() : '—',
  },
  {
    label: 'Tiempo entrega',
    getValue: (d) => d.snapshot?.deliveryTimeMin ? `${d.snapshot.deliveryTimeMin} min` : '—',
    getAvgValue: (a) => a.deliveryTimeMin ? `${Math.round(a.deliveryTimeMin)} min` : '—',
  },
  {
    label: 'Promos activas',
    getValue: (d) => d.snapshot?.activePromoCount?.toString() ?? '—',
    getAvgValue: (a) => a.activePromoCount ? Math.round(a.activePromoCount).toString() : '—',
  },
];

export function ComparisonTable({ hero, competitors, compsetAvg }: ComparisonTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-3 font-medium text-gray-500 w-36">Métrica</th>
            {hero && (
              <th className="text-center py-3 px-3 font-semibold text-primary-600 bg-primary-50/50 min-w-[100px]">
                {hero.competitor.name}
              </th>
            )}
            {competitors.map((c) => (
              <th key={c.competitor.id} className="text-center py-3 px-3 font-medium text-gray-700 min-w-[100px]">
                <div>{c.competitor.name}</div>
                <div className="text-[10px] font-normal text-gray-400">
                  {PLATFORM_LABELS[c.competitor.platform]}
                </div>
              </th>
            ))}
            <th className="text-center py-3 px-3 font-medium text-gray-500 bg-gray-50 min-w-[100px]">
              Media CompSet
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={row.label}
              className={cn(
                'border-b border-gray-100',
                idx % 2 === 0 && 'bg-gray-50/30'
              )}
            >
              <td className="py-2.5 px-3 font-medium text-gray-600">{row.label}</td>
              {hero && (
                <td className="text-center py-2.5 px-3 font-semibold text-gray-900 bg-primary-50/30">
                  {row.getValue(hero)}
                </td>
              )}
              {competitors.map((c) => (
                <td key={c.competitor.id} className="text-center py-2.5 px-3 text-gray-700">
                  {row.getValue(c)}
                </td>
              ))}
              <td className="text-center py-2.5 px-3 text-gray-500 bg-gray-50 font-medium">
                {row.getAvgValue(compsetAvg)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
