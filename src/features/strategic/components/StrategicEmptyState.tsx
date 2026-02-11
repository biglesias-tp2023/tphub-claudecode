import { TrendingUp, Sparkles } from 'lucide-react';

interface StrategicEmptyStateProps {
  onSetupClick: () => void;
}

export function StrategicEmptyState({ onSetupClick }: StrategicEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center mb-6 shadow-lg shadow-primary-500/20">
        <Sparkles className="w-10 h-10 text-white" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">
        Todavía no tienes ningún objetivo
      </h2>
      <p className="text-sm text-gray-500 mb-8 text-center max-w-md">
        Es el momento de empezar a definir tu estrategia de ventas. Configura tus canales, inversiones y objetivos mensuales.
      </p>
      <button
        onClick={onSetupClick}
        className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-lg shadow-primary-600/25 transition-all hover:shadow-xl hover:shadow-primary-600/30"
      >
        <TrendingUp className="w-5 h-5" />
        Configurar proyección de ventas
      </button>
    </div>
  );
}
