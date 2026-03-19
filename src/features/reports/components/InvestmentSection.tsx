/**
 * InvestmentSection — table with ROAS data and dropdown decisions per location.
 */

import type { LocationRow, InvestmentDecisionMap, InvestmentDecisionValue } from '../types';
import { INVESTMENT_DECISIONS, locationKey, suggestDecision } from '../types';
import { useEffect, useRef } from 'react';

interface InvestmentSectionProps {
  investments: LocationRow[];
  decisions: InvestmentDecisionMap;
  onDecisionChange: (key: string, value: InvestmentDecisionValue) => void;
}

function formatChannel(ch: string): string {
  if (ch === 'glovo') return 'Glovo';
  if (ch === 'ubereats') return 'UberEats';
  return ch;
}

function formatEur(n: number): string {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + '\u20AC';
}

export function InvestmentSection({ investments, decisions, onDecisionChange }: InvestmentSectionProps) {
  const initialized = useRef(false);

  // Pre-select suggestions on first render
  useEffect(() => {
    if (initialized.current || investments.length === 0) return;
    initialized.current = true;

    for (const loc of investments) {
      const key = locationKey(loc);
      if (!decisions.has(key)) {
        const suggestion = suggestDecision(loc.roasAds);
        if (suggestion) {
          onDecisionChange(key, suggestion);
        }
      }
    }
  }, [investments, decisions, onDecisionChange]);

  if (investments.length === 0) {
    return null;
  }

  // Sort: Glovo first, then UberEats. Within each channel, alphabetical by address.
  const sorted = [...investments].sort((a, b) => {
    if (a.channelId !== b.channelId) return a.channelId === 'glovo' ? -1 : 1;
    return a.addressName.localeCompare(b.addressName, 'es');
  });

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">Decisiones de Inversión</h3>
        <p className="text-xs text-gray-500 mt-0.5">Selecciona la decisión para cada ubicación con ADS activos</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Ubicación</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Plat.</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Inv.</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">ROAS</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Decisión</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((loc) => {
              const key = locationKey(loc);
              const currentValue = decisions.get(key) ?? '';

              return (
                <tr key={key} className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-gray-900">
                    <div className="font-medium">{loc.storeName}</div>
                    <div className="text-xs text-gray-500">{loc.addressName}</div>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {formatChannel(loc.channelId)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-600">
                    {formatEur(loc.adSpent)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={
                      loc.roasAds != null && loc.roasAds >= 5
                        ? 'text-emerald-600 font-semibold'
                        : loc.roasAds != null && loc.roasAds >= 3
                        ? 'text-amber-600 font-semibold'
                        : 'text-red-600 font-semibold'
                    }>
                      {loc.roasAds != null ? `${loc.roasAds}x` : '\u2014'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="relative">
                      <select
                        value={currentValue}
                        onChange={(e) => onDecisionChange(key, e.target.value as InvestmentDecisionValue)}
                        className="w-full max-w-[220px] rounded-lg border border-gray-300 bg-white appearance-none cursor-pointer px-3 py-1.5 pr-8 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-primary-500 focus:ring-primary-500/20"
                      >
                        <option value="">Pendiente</option>
                        {INVESTMENT_DECISIONS.map((d) => (
                          <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-gray-400">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
