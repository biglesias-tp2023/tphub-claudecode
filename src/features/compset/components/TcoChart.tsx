import { cn } from '@/utils/cn';
import type { CompetitorWithData } from '../types';

interface TcoChartProps {
  hero: CompetitorWithData | null;
  competitors: CompetitorWithData[];
}

interface TcoEntry {
  name: string;
  productPrice: number;
  deliveryFee: number;
  serviceFee: number;
  total: number;
  isHero: boolean;
}

export function TcoChart({ hero, competitors }: TcoChartProps) {
  const entries: TcoEntry[] = [];

  const all = hero ? [hero, ...competitors] : competitors;

  for (const c of all) {
    if (!c.snapshot) continue;
    const productPrice = c.snapshot.avgTicket ?? 0;
    const deliveryFee = c.snapshot.deliveryFee ?? 0;
    const serviceFee = c.snapshot.serviceFee ?? 0;
    entries.push({
      name: c.competitor.name,
      productPrice,
      deliveryFee,
      serviceFee,
      total: productPrice + deliveryFee + serviceFee,
      isHero: c.competitor.id === hero?.competitor.id,
    });
  }

  entries.sort((a, b) => a.total - b.total);

  const maxTotal = Math.max(...entries.map((e) => e.total), 1);

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div key={entry.name} className="flex items-center gap-3">
          <div
            className={cn(
              'w-28 text-xs truncate text-right',
              entry.isHero ? 'font-semibold text-primary-700' : 'text-gray-600'
            )}
            title={entry.name}
          >
            {entry.name}
          </div>
          <div className="flex-1 flex items-center gap-px h-7">
            <div
              className="h-full rounded-l bg-primary-600 flex items-center justify-center"
              style={{ width: `${(entry.productPrice / maxTotal) * 100}%` }}
            >
              {entry.productPrice > maxTotal * 0.15 && (
                <span className="text-[10px] text-white font-medium">
                  {entry.productPrice.toFixed(1)}€
                </span>
              )}
            </div>
            <div
              className="h-full bg-primary-300 flex items-center justify-center"
              style={{ width: `${(entry.deliveryFee / maxTotal) * 100}%` }}
            >
              {entry.deliveryFee > maxTotal * 0.08 && (
                <span className="text-[10px] text-white font-medium">
                  {entry.deliveryFee.toFixed(1)}€
                </span>
              )}
            </div>
            <div
              className="h-full rounded-r bg-primary-100 flex items-center justify-center"
              style={{ width: `${(entry.serviceFee / maxTotal) * 100}%` }}
            >
              {entry.serviceFee > maxTotal * 0.05 && (
                <span className="text-[10px] text-primary-700 font-medium">
                  {entry.serviceFee.toFixed(1)}€
                </span>
              )}
            </div>
          </div>
          <div className="w-16 text-xs font-semibold text-gray-700 text-right">
            {entry.total.toFixed(2)}€
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <div className="w-3 h-3 rounded-sm bg-primary-600" />
          Producto
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <div className="w-3 h-3 rounded-sm bg-primary-300" />
          Delivery fee
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <div className="w-3 h-3 rounded-sm bg-primary-100" />
          Service fee
        </div>
      </div>
    </div>
  );
}
