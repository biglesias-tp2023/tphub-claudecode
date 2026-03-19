/**
 * ProductsAnalysisTable
 *
 * Sortable ranking table of products with quantity, revenue, and percentage columns.
 * Includes search filtering and a totals row.
 */

import { useState, useMemo } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import type { ProductAnalysisRow } from '@/types/product';

type SortKey = 'productName' | 'unitPrice' | 'totalQuantity' | 'quantityPercent' | 'totalRevenue' | 'revenuePercent';
type SortDir = 'asc' | 'desc';

interface Props {
  data: ProductAnalysisRow[];
  isLoading?: boolean;
}

export function ProductsAnalysisTable({ data, isLoading }: Props) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('totalRevenue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((row) => row.productName.toLowerCase().includes(q));
  }, [data, search]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      const diff = (aVal as number) - (bVal as number);
      return sortDir === 'asc' ? diff : -diff;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const totals = useMemo(() => {
    const totalQty = filtered.reduce((s, r) => s + r.totalQuantity, 0);
    const totalRev = filtered.reduce((s, r) => s + r.totalRevenue, 0);
    return { totalQuantity: totalQty, totalRevenue: totalRev };
  }, [filtered]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'productName' ? 'asc' : 'desc');
    }
  }

  const sortIcon = (column: SortKey) => {
    if (sortKey !== column) return <ArrowUpDown className="w-3.5 h-3.5 text-gray-300" />;
    return sortDir === 'asc'
      ? <ArrowUp className="w-3.5 h-3.5 text-primary-600" />
      : <ArrowDown className="w-3.5 h-3.5 text-primary-600" />;
  };

  const formatPct = (val: number) => `${val.toFixed(1).replace('.', ',')}%`;

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {/* Search bar */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">
                #
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
                onClick={() => handleSort('productName')}
              >
                <span className="inline-flex items-center gap-1.5">
                  Producto
                  {sortIcon('productName')}
                </span>
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
                onClick={() => handleSort('unitPrice')}
              >
                <span className="inline-flex items-center gap-1.5 justify-end">
                  Precio
                  {sortIcon('unitPrice')}
                </span>
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
                onClick={() => handleSort('totalQuantity')}
              >
                <span className="inline-flex items-center gap-1.5 justify-end">
                  Total (uds)
                  {sortIcon('totalQuantity')}
                </span>
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
                onClick={() => handleSort('quantityPercent')}
              >
                <span className="inline-flex items-center gap-1.5 justify-end">
                  Total %
                  {sortIcon('quantityPercent')}
                </span>
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
                onClick={() => handleSort('totalRevenue')}
              >
                <span className="inline-flex items-center gap-1.5 justify-end">
                  Ventas
                  {sortIcon('totalRevenue')}
                </span>
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
                onClick={() => handleSort('revenuePercent')}
              >
                <span className="inline-flex items-center gap-1.5 justify-end">
                  Ventas %
                  {sortIcon('revenuePercent')}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  {search ? 'No se encontraron productos' : 'Sin datos de productos para el periodo seleccionado'}
                </td>
              </tr>
            ) : (
              <>
                {sorted.map((row, idx) => (
                  <tr
                    key={row.productId}
                    className={cn(
                      'border-b border-gray-50 hover:bg-gray-50/50 transition-colors',
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                    )}
                  >
                    <td className="px-4 py-2.5 text-gray-400 font-medium tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-2.5 text-gray-900 font-medium max-w-xs truncate">
                      {row.productName}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-600 tabular-nums">
                      {formatCurrency(row.unitPrice)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-900 font-medium tabular-nums">
                      {formatNumber(row.totalQuantity)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-500 tabular-nums">
                      {formatPct(row.quantityPercent)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-900 font-medium tabular-nums">
                      {formatCurrency(row.totalRevenue)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-500 tabular-nums">
                      {formatPct(row.revenuePercent)}
                    </td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 text-gray-900">
                    Total ({filtered.length} productos)
                  </td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 text-right text-gray-900 tabular-nums">
                    {formatNumber(totals.totalQuantity)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 tabular-nums">
                    100%
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900 tabular-nums">
                    {formatCurrency(totals.totalRevenue)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 tabular-nums">
                    100%
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
