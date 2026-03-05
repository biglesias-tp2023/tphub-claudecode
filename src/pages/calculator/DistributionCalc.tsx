import { useState, useMemo, useCallback } from 'react';
import { Receipt, Bike, MapPinned } from 'lucide-react';
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
        'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
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

  // --- Validation ---

  const errors = useMemo(() => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (form.ticketMedio <= 0) e.ticketMedio = 'Debe ser > 0';
    if (form.pedidosHora <= 0 && form.fleetType === 'propia') e.pedidosHora = 'Debe ser > 0';
    if (form.distMin < 0) e.distMin = 'No puede ser negativo';
    if (form.distMax <= 0) e.distMax = 'Debe ser > 0';
    if (form.distMin >= form.distMax) {
      e.distMin = 'Mín. debe ser < Máx.';
      e.distMax = 'Máx. debe ser > Mín.';
    }
    return e;
  }, [form]);

  const warns = useMemo(() => {
    const w: Partial<Record<keyof FormState, string>> = {};
    if (form.foodCost > 50) w.foodCost = 'Valor inusualmente alto';
    if (form.feeMarketplace > 35) w.feeMarketplace = 'Valor inusualmente alto';
    return w;
  }, [form]);

  const hasErrors = Object.keys(errors).length > 0;

  const inputCn = useCallback(
    (field: keyof FormState, extra?: string) =>
      cn(
        INPUT_CLASS,
        errors[field] && 'border-red-300 focus:ring-red-400',
        !errors[field] && warns[field] && 'border-amber-300 focus:ring-amber-400',
        extra,
      ),
    [errors, warns],
  );

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

    const totalTimeRef = form.pedidosHora > 0 ? 60 / form.pedidosHora : 20;
    const travelTimeRef = (distMid * 2 / speed) * 60;
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
    <div className="space-y-3">

      {/* ===== CONFIG BAR (full width, inline) ===== */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Plataforma</span>
            <div className="flex gap-1">
              {(Object.keys(PLATFORMS) as Platform[]).map((p) => (
                <Pill key={p} active={form.platform === p} onClick={() => handlePlatformChange(p)}>
                  {PLATFORMS[p].label}
                </Pill>
              ))}
            </div>
          </div>

          <div className="w-px h-5 bg-gray-200 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Flota</span>
            <div className="flex gap-1">
              <Pill active={form.fleetType === 'propia'} onClick={() => set('fleetType', 'propia')}>Propia</Pill>
              <Pill active={form.fleetType === 'externa'} onClick={() => set('fleetType', 'externa')}>Externa</Pill>
            </div>
            {form.fleetType === 'externa' && (
              <select
                value={form.externalProvider}
                onChange={(e) => set('externalProvider', e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1 text-[11px] text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {EXTERNAL_PROVIDERS.map((prov) => (
                  <option key={prov} value={prov}>{prov}</option>
                ))}
              </select>
            )}
          </div>

          <div className="w-px h-5 bg-gray-200 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Vehículo</span>
            <div className="flex gap-1">
              <Pill active={form.vehicle === 'moto'} onClick={() => set('vehicle', 'moto')}>
                Moto ({VEHICLE_SPEED.moto} km/h)
              </Pill>
              <Pill active={form.vehicle === 'bici'} onClick={() => set('vehicle', 'bici')}>
                Bici ({VEHICLE_SPEED.bici} km/h)
              </Pill>
            </div>
          </div>
        </div>

        {form.fleetType === 'externa' && (
          <p className="text-[11px] text-amber-600 mt-2">
            Con flota externa, el coste del rider no se aplica directamente.
          </p>
        )}
      </div>

      {/* ===== MAIN GRID ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">

        {/* LEFT: Single parameters card */}
        <div className="lg:col-span-3">
          <div className="bg-gray-50/70 rounded-xl border border-gray-200 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary-500" />
              Datos del negocio
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Field label="Ticket medio (€)">
                <input type="number" step="0.01" value={form.ticketMedio} onChange={(e) => setNum('ticketMedio', e.target.value)} className={inputCn('ticketMedio')} />
                {errors.ticketMedio && <p className="text-[11px] text-red-500 mt-0.5">{errors.ticketMedio}</p>}
              </Field>
              <Field label="Pedidos / mes">
                <input type="number" step="1" value={form.pedidosMes} onChange={(e) => setNum('pedidosMes', e.target.value)} className={INPUT_CLASS} />
              </Field>
              <Field label="Fee marketplace (%)">
                <input type="number" step="0.1" value={form.feeMarketplace} onChange={(e) => setNum('feeMarketplace', e.target.value)} className={inputCn('feeMarketplace')} />
                {warns.feeMarketplace && <p className="text-[11px] text-amber-500 mt-0.5">{warns.feeMarketplace}</p>}
              </Field>
              <Field label="Food cost (%)">
                <input type="number" step="0.1" value={form.foodCost} onChange={(e) => setNum('foodCost', e.target.value)} className={inputCn('foodCost')} />
                {warns.foodCost && <p className="text-[11px] text-amber-500 mt-0.5">{warns.foodCost}</p>}
              </Field>
              <Field label="Promos (%)">
                <input type="number" step="0.1" value={form.promos} onChange={(e) => setNum('promos', e.target.value)} className={INPUT_CLASS} />
              </Field>
              <Field label="Ads (%)">
                <input type="number" step="0.1" value={form.ads} onChange={(e) => setNum('ads', e.target.value)} className={INPUT_CLASS} />
              </Field>
            </div>

            {/* Divider + Reparto section */}
            <div className="border-t border-gray-100 pt-3">
              <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Bike className="w-3.5 h-3.5 text-primary-400" />
                Reparto
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field label="Coste rider (€/h)">
                  <input
                    type="number"
                    step="0.5"
                    value={form.riderCostHour}
                    onChange={(e) => setNum('riderCostHour', e.target.value)}
                    className={inputCn('riderCostHour', form.fleetType === 'externa' ? 'opacity-50 cursor-not-allowed' : undefined)}
                    disabled={form.fleetType === 'externa'}
                  />
                </Field>
                <Field label="Pedidos / hora (ref.)">
                  <input type="number" step="0.5" value={form.pedidosHora} onChange={(e) => setNum('pedidosHora', e.target.value)} className={inputCn('pedidosHora')} />
                  {errors.pedidosHora && <p className="text-[11px] text-red-500 mt-0.5">{errors.pedidosHora}</p>}
                </Field>
                <Field label="Margen objetivo (%)">
                  <input type="number" step="0.5" value={form.margenObjetivo} onChange={(e) => setNum('margenObjetivo', e.target.value)} className={INPUT_CLASS} />
                </Field>
                <Field label="Distancia mín. (km)">
                  <input type="number" step="0.5" value={form.distMin} onChange={(e) => setNum('distMin', e.target.value)} className={inputCn('distMin')} />
                  {errors.distMin && <p className="text-[11px] text-red-500 mt-0.5">{errors.distMin}</p>}
                </Field>
                <Field label="Distancia máx. (km)">
                  <input type="number" step="0.5" value={form.distMax} onChange={(e) => setNum('distMax', e.target.value)} className={inputCn('distMax')} />
                  {errors.distMax && <p className="text-[11px] text-red-500 mt-0.5">{errors.distMax}</p>}
                </Field>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Results */}
        <div className="lg:col-span-2 space-y-3">

          {/* Hero KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <HeroKpi label="Margen por pedido" value={eur(calc.margenPedido)} positive={calc.margenPedido >= 0} />
            <HeroKpi label="Margen %" value={pct(calc.margenPct)} positive={calc.margenPct >= 0} />
          </div>

          {/* Waterfall breakdown */}
          <WaterfallBreakdown lines={waterfallLines} pctBase={form.ticketMedio} />

          {/* Combined: cumple + margen mensual */}
          <div className={cn(
            'rounded-xl border p-4',
            hasErrors
              ? 'bg-gray-50 border-gray-200'
              : calc.cumpleMargen
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-red-50 border-red-200',
          )}>
            {hasErrors ? (
              <div className="flex items-center gap-2">
                <span className="text-amber-500 text-base">!</span>
                <p className="text-sm text-gray-500">Corrige los campos marcados para ver el resultado.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className={cn('text-lg', calc.cumpleMargen ? 'text-emerald-600' : 'text-red-600')}>
                    {calc.cumpleMargen ? '✓' : '✗'}
                  </span>
                  <div>
                    <p className={cn('text-sm font-semibold', calc.cumpleMargen ? 'text-emerald-700' : 'text-red-700')}>
                      {calc.cumpleMargen ? 'Cumple margen objetivo' : 'No cumple margen objetivo'}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Objetivo: {pct(form.margenObjetivo)} ({eur(calc.margenObjetivoEur)}/pedido)
                    </p>
                  </div>
                </div>
                <div className={cn(
                  'mt-3 pt-3 text-center',
                  calc.cumpleMargen ? 'border-t border-emerald-200' : 'border-t border-red-200',
                )}>
                  <p className="text-[11px] text-gray-500 mb-0.5">Margen mensual estimado</p>
                  <p className={cn(
                    'text-xl font-bold tabular-nums',
                    calc.margenMensual >= 0 ? 'text-emerald-700' : 'text-red-700',
                  )}>
                    {eur(calc.margenMensual)}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {form.pedidosMes} pedidos × {eur(calc.margenPedido)}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ===== FULL WIDTH: Projection Table ===== */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-100 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <MapPinned className="w-4 h-4 text-primary-500 shrink-0 relative top-px" />
            Proyección por distancia (1–10 km)
          </h3>
          <p className="text-[11px] text-gray-400">
            Edita el envío para simular escenarios
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] text-gray-500 uppercase tracking-wide">
                <th className="px-3 py-2 text-left font-medium">KM</th>
                <th className="px-2 py-2 text-right font-medium">Ped/h</th>
                <th className="px-2 py-2 text-right font-medium">Rider</th>
                <th className="px-2 py-2 text-right font-medium">Coste</th>
                <th className="px-2 py-2 text-center font-medium">Tu envío</th>
                <th className="px-2 py-2 text-right font-medium">Margen</th>
                <th className="px-2 py-2 text-right font-medium">%</th>
                <th className="px-2 py-2 text-right font-medium">Mín.</th>
                <th className="px-2 py-2 w-20 font-medium" />
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
                    <td className="px-3 py-1.5 font-medium text-gray-900 text-xs">
                      {row.inRange && <span className="mr-0.5 text-primary-500">★</span>}
                      {row.km}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-gray-600 text-xs">
                      {row.pedidosHora.toFixed(1)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-gray-600 text-xs">
                      {eur(row.riderCostPerOrder)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-gray-600 text-xs">
                      {eur(row.costeTotal)}
                    </td>
                    <td className="px-1 py-1 text-center">
                      <input
                        type="number"
                        step="0.1"
                        value={row.envio}
                        onChange={(e) => handleEnvioChange(idx, e.target.value)}
                        className={cn(
                          'w-16 border rounded px-1.5 py-0.5 text-xs text-center tabular-nums bg-white focus:outline-none focus:ring-1 focus:ring-primary-500',
                          isBelow ? 'border-red-400 text-red-600 bg-red-50' : 'border-gray-200 text-gray-700',
                        )}
                      />
                    </td>
                    <td className={cn('px-2 py-1.5 text-right tabular-nums font-semibold text-xs', marginColor)}>
                      {eur(row.margenEur)}
                    </td>
                    <td className={cn('px-2 py-1.5 text-right tabular-nums font-semibold text-xs', marginColor)}>
                      {pct(row.margenPct)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-gray-400 text-xs">
                      {eur(row.minEnvio)}
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
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
        <div className="px-4 py-2 border-t border-gray-100 flex flex-wrap gap-4 text-[10px] text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> ≥ Objetivo
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-1.5 rounded-full bg-amber-400 inline-block" /> Positivo
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-1.5 rounded-full bg-red-400 inline-block" /> Negativo
          </span>
          <span className="flex items-center gap-1">
            <span className="text-primary-500 text-[11px]">★</span> Rango configurado
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-1.5 rounded border border-red-400 inline-block bg-red-50" /> Envío &lt; mínimo sugerido
          </span>
        </div>
      </div>
    </div>
  );
}
