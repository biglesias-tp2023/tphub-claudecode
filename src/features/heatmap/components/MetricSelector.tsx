import type { HeatmapMetric } from '../types';

const METRIC_OPTIONS: { value: HeatmapMetric; label: string }[] = [
  { value: 'revenue', label: 'Ventas' },
  { value: 'orders', label: '# Pedidos' },
  { value: 'avgTicket', label: 'Ticket Medio' },
  { value: 'newCustomers', label: 'Nuevos clientes' },
];

interface MetricSelectorProps {
  value: HeatmapMetric;
  onChange: (metric: HeatmapMetric) => void;
}

export function MetricSelector({ value, onChange }: MetricSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as HeatmapMetric)}
      className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
    >
      {METRIC_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
