import { AlertTriangle, AlertCircle, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import type { CustomerChurnRisk } from '@/services/crp-portal';

interface ChurnRiskTableProps {
  data: CustomerChurnRisk[];
  onViewAll?: () => void;
}

const RISK_STYLES: Record<CustomerChurnRisk['riskLevel'], { bg: string; text: string; icon: React.ElementType }> = {
  high: { bg: 'bg-red-50', text: 'text-red-700', icon: AlertTriangle },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700', icon: AlertCircle },
  low: { bg: 'bg-gray-50', text: 'text-gray-600', icon: AlertCircle },
};

const RISK_LABELS: Record<CustomerChurnRisk['riskLevel'], string> = {
  high: 'Alto',
  medium: 'Medio',
  low: 'Bajo',
};

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} sem.`;
  if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} meses`;
  return `Hace ${Math.floor(diffDays / 365)} años`;
}

export function ChurnRiskTable({ data, onViewAll }: ChurnRiskTableProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="text-center text-gray-500 py-8">
          No hay clientes en riesgo de pérdida
        </div>
      </div>
    );
  }

  const highRiskCount = data.filter((c) => c.riskLevel === 'high').length;
  const mediumRiskCount = data.filter((c) => c.riskLevel === 'medium').length;

  return (
    <div className="bg-white rounded-xl border border-gray-100">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Clientes en Riesgo de Pérdida</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {highRiskCount} alto riesgo · {mediumRiskCount} riesgo medio
          </p>
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
          >
            Ver todos <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left py-2.5 px-4 font-medium text-gray-500 text-xs">Cliente ID</th>
              <th className="text-left py-2.5 px-3 font-medium text-gray-500 text-xs">Último Pedido</th>
              <th className="text-right py-2.5 px-3 font-medium text-gray-500 text-xs">Pedidos</th>
              <th className="text-right py-2.5 px-3 font-medium text-gray-500 text-xs">Gasto Total</th>
              <th className="text-right py-2.5 px-3 font-medium text-gray-500 text-xs">Frec. (días)</th>
              <th className="text-center py-2.5 px-4 font-medium text-gray-500 text-xs">Riesgo</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 10).map((customer) => {
              const riskStyle = RISK_STYLES[customer.riskLevel];
              const RiskIcon = riskStyle.icon;

              return (
                <tr key={customer.customerId} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="py-2.5 px-4">
                    <span className="font-mono text-xs text-gray-700">
                      {customer.customerId.slice(0, 12)}...
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <div>
                      <span className="text-xs text-gray-900">{formatRelativeDate(customer.lastOrderDate)}</span>
                      <p className="text-[10px] text-gray-400">{customer.daysSinceLastOrder} días</p>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right text-gray-600 text-xs tabular-nums">
                    {formatNumber(customer.totalOrders)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-gray-900 font-medium text-xs tabular-nums">
                    {formatCurrency(customer.totalSpend)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-gray-600 text-xs tabular-nums">
                    {customer.avgFrequencyDays}
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="flex justify-center">
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium',
                        riskStyle.bg,
                        riskStyle.text
                      )}>
                        <RiskIcon className="w-3 h-3" />
                        {RISK_LABELS[customer.riskLevel]}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {data.length > 10 && (
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 text-center">
          <span className="text-xs text-gray-500">
            Mostrando 10 de {data.length} clientes en riesgo
          </span>
        </div>
      )}
    </div>
  );
}
