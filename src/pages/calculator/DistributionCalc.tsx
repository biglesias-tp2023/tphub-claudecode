import { useState, useMemo, useCallback } from 'react';
import { Store, Truck, MapPin } from 'lucide-react';
import { Field, HeroKpi, WaterfallBreakdown, eur, pct, INPUT_CLASS } from './components';
import type { WaterfallLine } from './components';
import { useSessionState } from '@/hooks/useSessionState';
import { cn } from '@/utils/cn';

// --- Types & Constants ---

type Platform = 'ubereats' | 'glovo' | 'justeat';
type FleetType = 'propia' | 'externa';
type Vehicle = 'moto' | 'bici';

const PLATFORMS: Record<Platform, { label: string; fee: number; promos: number; ads: number }> = {
  ubereats: { label: 'UberEats', fee: 15, promos: 3, ads: 3 },
  glovo:    { label: 'Glovo',    fee: 15, promos: 5, ads: 3 },
  justeat:  { label: 'JustEat',  fee: 15, promos: 3, ads: 2 },
};

const VEHICLE_SPEED: Record<Vehicle, number> = { moto: 25, bici: 15 };
const DEFAULT_ENVIOS = [1.5, 1.9, 2.3, 2.7, 3.1, 3.5, 3.9, 4.3, 4.7, 5.1];
const EXTERNAL_PROVIDERS = ['Catcher', 'GlovoBusiness', 'UberDirect', 'Otros'];

interface FormState {
  platform: Platform;
  fleetType: FleetType;
  vehicle: Vehicle;
  externalProvider: string;
  ticketMedio: number;
  pedidosMes: number;
  feeMarketplace: number;
  foodCost: number;
  promos: number;
  ads: number;
  riderCostHour: number;
  pedidosHora: number;
  distMin: number;
  distMax: number;
  margenObjetivo: number;
}

const defaultForm: FormState = {
  platform: 'glovo',
  fleetType: 'propia',
  vehicle: 'moto',
  externalProvider: 'Catcher',
  ticketMedio: 22,
  pedidosMes: 800,
  feeMarketplace: 15,
  foodCost: 30,
  promos: 5,
  ads: 3,
  riderCostHour: 10,
  pedidosHora: 3,
  distMin: 1,
  distMax: 5,
  margenObjetivo: 10,
};

// --- Helpers ---

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
        active
          ? 'bg-primary-600 text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
      )}
    >
      {children}
    </button>
  );
}

// --- Component ---

export function DistributionCalc() {
  const [form, setForm] = useSessionState<FormState>('tphub-calc-distrib', defaultForm);
  const [envios, setEnvios] = useState<number[]>([...DEFAULT_ENVIOS]);

  const set = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) =>
      setForm((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const setNum = useCallback(
    (key: keyof FormState, raw: string) => {
      const n = Number(raw);
      if (Number.isFinite(n)) set(key, n as never);
    },
    [set],
  );

  const handlePlatformChange = useCallback((p: Platform) => {
    const cfg = PLATFORMS[p];
    setForm((prev) => ({
      ...prev,
      platform: p,
      feeMarketplace: cfg.fee,
      promos: cfg.promos,
      ads: cfg.ads,
    }));
  }, []);

  const handleEnvioChange = useCallback((idx: number, raw: string) => {
    const n = Number(raw);
    if (Number.isFinite(n)) {
      setEnvios((prev) => {
        const next = [...prev];
        next[idx] = n;
        return next;
      });
    }
  }, []);

  // --- Summary calculations ---

  const calc = useMemo(() => {
    const feeEur = form.ticketMedio * form.feeMarketplace / 100;
    const promosEur = form.ticketMedio * form.promos / 100;
    const adsEur = form.ticketMedio * form.ads / 100;
    const foodCostEur = form.ticketMedio * form.foodCost / 100;
    const riderCostPerOrder =
      form.fleetType === 'propia' && form.pedidosHora > 0
        ? form.riderCostHour / form.pedidosHora
        : 0;

    // Average envío in user's distance range
    const rangeStart = Math.max(0, Math.ceil(form.distMin) - 1);
    const rangeEnd = Math.min(9, Math.floor(form.distMax) - 1);
    let midEnvio = 0;
    if (rangeEnd >= rangeStart) {
      const slice = envios.slice(rangeStart, rangeEnd + 1);
      midEnvio = slice.reduce((s, v) => s + v, 0) / slice.length;
    }

    const sumaCostes = feeEur + promosEur + adsEur + foodCostEur + riderCostPerOrder;
    const margenPedido = form.ticketMedio + midEnvio - sumaCostes;
    const margenPct = form.ticketMedio > 0 ? (margenPedido / form.ticketMedio) * 100 : 0;
    const margenObjetivoEur = form.ticketMedio * form.margenObjetivo / 100;
    const cumpleMargen = margenPedido >= margenObjetivoEur;
    const margenMensual = margenPedido * form.pedidosMes;

    return {
      feeEur, promosEur, adsEur, foodCostEur, riderCostPerOrder,
      midEnvio, sumaCostes,
      margenPedido, margenPct, margenObjetivoEur, cumpleMargen, margenMensual,
    };
  }, [form, envios]);

  // --- Projection table (1-10 km) ---

  const projection = useMemo(() => {
    const speed = VEHICLE_SPEED[form.vehicle];
    const distMid = (form.distMin + form.distMax) / 2;

    // Back-calculate fixed time (prep + pickup + dropoff) from user reference
    const totalTimeRef = form.pedidosHora > 0 ? 60 / form.pedidosHora : 20;
    const travelTimeRef = (distMid * 2 / speed) * 60; // round trip in minutes
    const fixedTime = Math.max(1, totalTimeRef - travelTimeRef);

    const feeEur = form.ticketMedio * form.feeMarketplace / 100;
    const promosEur = form.ticketMedio * form.promos / 100;
    const adsEur = form.ticketMedio * form.ads / 100;
    const foodCostEur = form.ticketMedio * form.foodCost / 100;
    const margenObjetivoEur = form.ticketMedio * form.margenObjetivo / 100;

    return Array.from({ length: 10 }, (_, i) => {
      const km = i + 1;
      const travelTime = (km * 2 / speed) * 60;
      const pedidosHora = 60 / (fixedTime + travelTime);
      const riderCostPerOrder =
        form.fleetType === 'propia' ? form.riderCostHour / pedidosHora : 0;
      const costeTotal = feeEur + promosEur + adsEur + foodCostEur + riderCostPerOrder;
      const envio = envios[i];
      const margenEur = form.ticketMedio + envio - costeTotal;
      const margenPct = form.ticketMedio > 0 ? (margenEur / form.ticketMedio) * 100 : 0;
      const minEnvio = Math.max(0, costeTotal + margenObjetivoEur - form.ticketMedio);
      const inRange = km >= Math.ceil(form.distMin) && km <= Math.floor(form.distMax);

      return { km, pedidosHora, riderCostPerOrder, costeTotal, envio, margenEur, margenPct, minEnvio, inRange };
    });
  }, [form, envios]);

  // --- Waterfall breakdown ---

  const waterfallLines: WaterfallLine[] = useMemo(() => [
    { label: 'Ticket medio',      value: form.ticketMedio,         type: 'income' },
    { label: 'Fee marketplace',    value: calc.feeEur,              type: 'deduction' },
    { label: 'Promos',             value: calc.promosEur,           type: 'deduction' },
    { label: 'Ads',                value: calc.adsEur,              type: 'deduction' },
    { label: 'Food cost',          value: calc.foodCostEur,         type: 'deduction' },
    { label: 'Coste rider',        value: calc.riderCostPerOrder,   type: 'deduction' },
    { label: 'Envío cobrado',      value: calc.midEnvio,            type: 'income' },
    { label: 'Margen por pedido',  value: calc.margenPedido,        type: 'result' },
  ], [form.ticketMedio, calc]);

  // --- Render ---

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ========== LEFT COLUMN (3/5) ========== */}
        <div className="lg:col-span-3 space-y-4">

          {/* Card: Configuración */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              <Store className="w-4 h-4 text-primary-500" />
              Configuración
            </h2>

            <div>
              <label className="block text-xs text-gray-500 mb-2">Plataforma</label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(PLATFORMS) as Platform[]).map((p) => (
                  <Pill key={p} active={form.platform === p} onClick={() => handlePlatformChange(p)}>
                    {PLATFORMS[p].label}
                  </Pill>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-2">Tipo de flota</label>
              <div className="flex flex-wrap gap-2 items-center">
                <Pill active={form.fleetType === 'propia'} onClick={() => set('fleetType', 'propia')}>
                  Propia
                </Pill>
                <Pill active={form.fleetType === 'externa'} onClick={() => set('fleetType', 'externa')}>
                  Externa
                </Pill>
                {form.fleetType === 'externa' && (
                  <select
                    value={form.externalProvider}
                    onChange={(e) => set('externalProvider', e.target.value)}
                    className="ml-2 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {EXTERNAL_PROVIDERS.map((prov) => (
                      <option key={prov} value={prov}>{prov}</option>
                    ))}
                  </select>
                )}
              </div>
              {form.fleetType === 'externa' && (
                <p className="text-[11px] text-amber-600 mt-1.5">
                  Con flota externa, el coste del rider no se aplica directamente.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-2">Vehículo</label>
              <div className="flex flex-wrap gap-2">
                <Pill active={form.vehicle === 'moto'} onClick={() => set('vehicle', 'moto')}>
                  Moto ({VEHICLE_SPEED.moto} km/h)
                </Pill>
                <Pill active={form.vehicle === 'bici'} onClick={() => set('vehicle', 'bici')}>
                  Bici ({VEHICLE_SPEED.bici} km/h)
                </Pill>
              </div>
            </div>
          </div>

          {/* Card: Datos del negocio */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary-500" />
              Datos del negocio
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Ticket medio (€)">
                <input type="number" step="0.01" value={form.ticketMedio} onChange={(e) => setNum('ticketMedio', e.target.value)} className={INPUT_CLASS} />
              </Field>
              <Field label="Pedidos / mes">
                <input type="number" step="1" value={form.pedidosMes} onChange={(e) => setNum('pedidosMes', e.target.value)} className={INPUT_CLASS} />
              </Field>
              <Field label="Fee marketplace (%)">
                <input type="number" step="0.1" value={form.feeMarketplace} onChange={(e) => setNum('feeMarketplace', e.target.value)} className={INPUT_CLASS} />
              </Field>
              <Field label="Food cost (%)">
                <input type="number" step="0.1" value={form.foodCost} onChange={(e) => setNum('foodCost', e.target.value)} className={INPUT_CLASS} />
              </Field>
              <Field label="Promos (%)">
                <input type="number" step="0.1" value={form.promos} onChange={(e) => setNum('promos', e.target.value)} className={INPUT_CLASS} />
              </Field>
              <Field label="Ads (%)">
                <input type="number" step="0.1" value={form.ads} onChange={(e) => setNum('ads', e.target.value)} className={INPUT_CLASS} />
              </Field>
            </div>
          </div>

          {/* Card: Reparto */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary-500" />
              Reparto
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Coste rider (€/h)">
                <input
                  type="number"
                  step="0.5"
                  value={form.riderCostHour}
                  onChange={(e) => setNum('riderCostHour', e.target.value)}
                  className={cn(INPUT_CLASS, form.fleetType === 'externa' && 'opacity-50 cursor-not-allowed')}
                  disabled={form.fleetType === 'externa'}
                />
              </Field>
              <Field label="Pedidos / hora (ref.)">
                <input type="number" step="0.5" value={form.pedidosHora} onChange={(e) => setNum('pedidosHora', e.target.value)} className={INPUT_CLASS} />
              </Field>
              <Field label="Distancia mín. (km)">
                <input type="number" step="0.5" value={form.distMin} onChange={(e) => setNum('distMin', e.target.value)} className={INPUT_CLASS} />
              </Field>
              <Field label="Distancia máx. (km)">
                <input type="number" step="0.5" value={form.distMax} onChange={(e) => setNum('distMax', e.target.value)} className={INPUT_CLASS} />
              </Field>
              <Field label="Margen objetivo (%)">
                <input type="number" step="0.5" value={form.margenObjetivo} onChange={(e) => setNum('margenObjetivo', e.target.value)} className={INPUT_CLASS} />
              </Field>
            </div>
          </div>
        </div>

        {/* ========== RIGHT COLUMN (2/5) ========== */}
        <div className="lg:col-span-2 space-y-4">

          {/* Hero KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <HeroKpi label="Margen por pedido" value={eur(calc.margenPedido)} positive={calc.margenPedido >= 0} />
            <HeroKpi label="Margen %" value={pct(calc.margenPct)} positive={calc.margenPct >= 0} />
          </div>

          {/* Waterfall breakdown */}
          <WaterfallBreakdown lines={waterfallLines} pctBase={form.ticketMedio} />

          {/* Cumple / no cumple margen */}
          <div className={cn(
            'rounded-xl border p-4',
            calc.cumpleMargen ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200',
          )}>
            <div className="flex items-center gap-2">
              <span className={cn('text-lg', calc.cumpleMargen ? 'text-emerald-600' : 'text-red-600')}>
                {calc.cumpleMargen ? '✓' : '✗'}
              </span>
              <div>
                <p className={cn('text-sm font-semibold', calc.cumpleMargen ? 'text-emerald-700' : 'text-red-700')}>
                  {calc.cumpleMargen ? 'Cumple margen objetivo' : 'No cumple margen objetivo'}
                </p>
                <p className="text-xs text-gray-500">
                  Objetivo: {pct(form.margenObjetivo)} ({eur(calc.margenObjetivoEur)}/pedido)
                </p>
              </div>
            </div>
          </div>

          {/* Margen mensual */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Margen mensual estimado</p>
            <p className={cn(
              'text-2xl font-bold tabular-nums',
              calc.margenMensual >= 0 ? 'text-emerald-700' : 'text-red-700',
            )}>
              {eur(calc.margenMensual)}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {form.pedidosMes} pedidos × {eur(calc.margenPedido)}
            </p>
          </div>
        </div>
      </div>

      {/* ========== FULL WIDTH: Projection Table ========== */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">
            Proyección por distancia (1–10 km)
          </h3>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Edita el envío cobrado para simular diferentes escenarios
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-2.5 text-left font-medium">KM</th>
                <th className="px-3 py-2.5 text-right font-medium">Ped/h</th>
                <th className="px-3 py-2.5 text-right font-medium">Rider €</th>
                <th className="px-3 py-2.5 text-right font-medium">Coste total</th>
                <th className="px-3 py-2.5 text-center font-medium">Tu envío €</th>
                <th className="px-3 py-2.5 text-right font-medium">Margen €</th>
                <th className="px-3 py-2.5 text-right font-medium">Margen %</th>
                <th className="px-3 py-2.5 text-right font-medium">Mín. envío €</th>
                <th className="px-3 py-2.5 w-24 font-medium" />
              </tr>
            </thead>
            <tbody>
              {projection.map((row, idx) => {
                const isBelow = row.envio < row.minEnvio;
                const barColor = row.margenEur < 0
                  ? 'bg-red-400'
                  : row.margenPct >= form.margenObjetivo
                    ? 'bg-emerald-400'
                    : 'bg-amber-400';
                const barWidth = Math.min(100, Math.max(0, (row.margenPct / Math.max(form.margenObjetivo * 2, 1)) * 100));
                const marginColor = row.margenEur < 0
                  ? 'text-red-600'
                  : row.margenPct >= form.margenObjetivo
                    ? 'text-emerald-600'
                    : 'text-amber-600';

                return (
                  <tr
                    key={row.km}
                    className={cn(
                      'border-b border-gray-50 transition-colors',
                      row.inRange ? 'bg-primary-50/40' : 'hover:bg-gray-50/50',
                    )}
                  >
                    <td className="px-4 py-2 font-medium text-gray-900">
                      {row.inRange && <span className="mr-1 text-primary-500">★</span>}
                      {row.km}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                      {row.pedidosHora.toFixed(1)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                      {eur(row.riderCostPerOrder)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                      {eur(row.costeTotal)}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <input
                        type="number"
                        step="0.1"
                        value={row.envio}
                        onChange={(e) => handleEnvioChange(idx, e.target.value)}
                        className={cn(
                          'w-20 border rounded-lg px-2 py-1 text-sm text-center tabular-nums bg-white focus:outline-none focus:ring-2 focus:ring-primary-500',
                          isBelow ? 'border-red-400 text-red-600' : 'border-gray-200 text-gray-700',
                        )}
                      />
                    </td>
                    <td className={cn('px-3 py-2 text-right tabular-nums font-semibold', marginColor)}>
                      {eur(row.margenEur)}
                    </td>
                    <td className={cn('px-3 py-2 text-right tabular-nums font-semibold', marginColor)}>
                      {pct(row.margenPct)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-500">
                      {eur(row.minEnvio)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', barColor)}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="px-5 py-3 border-t border-gray-100 flex flex-wrap gap-4 text-[11px] text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-full bg-emerald-400 inline-block" /> ≥ Margen objetivo
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-full bg-amber-400 inline-block" /> Margen positivo
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-full bg-red-400 inline-block" /> Margen negativo
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-primary-500">★</span> En rango de distancia configurado
          </span>
        </div>
      </div>
    </div>
  );
}
