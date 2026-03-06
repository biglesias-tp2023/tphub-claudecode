import { useSessionState } from '@/hooks/useSessionState';
import { DashboardFilters } from '@/features/dashboard';
import { CalcErrorBoundary } from './components';
import { DeliveryMarginCalc } from './DeliveryMarginCalc';
import { PhotoSessionCalc } from './PhotoSessionCalc';
import { DistributionCalc } from './DistributionCalc';

type TabId = 'delivery' | 'photo' | 'distrib';

const tabs: { id: TabId; label: string }[] = [
  { id: 'delivery', label: 'Márgenes Delivery' },
  { id: 'photo', label: 'Sesión de Fotos' },
  { id: 'distrib', label: 'Reparto' },
];

export function CalculatorPage() {
  const [activeTab, setActiveTab] = useSessionState<TabId>('tphub-calculator-tab', 'delivery');

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calculadoras</h1>
        <p className="text-sm text-gray-500 mt-1">
          Herramientas de cálculo para consultoría de delivery
        </p>
      </div>

      {/* Filters */}
      <DashboardFilters />

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <CalcErrorBoundary>
        {activeTab === 'delivery' && <DeliveryMarginCalc />}
        {activeTab === 'photo' && <PhotoSessionCalc />}
        {activeTab === 'distrib' && <DistributionCalc />}
      </CalcErrorBoundary>
    </div>
  );
}
