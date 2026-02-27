import { useState, useMemo, useCallback, useEffect } from 'react';
import { Plus, Download, Trash2, X } from 'lucide-react';

// --- Types ---

type PromoType = 'none' | 'pct' | '2x1';
type CommissionBase = 'bruto' | 'neto';

interface FormState {
  producto: string;
  pvp: number;
  ivaComida: number;
  comisionPct: number;
  ivaComisionPct: number;
  baseComision: CommissionBase;
  promoTipo: PromoType;
  promoValor: number;
  ingredientes: number;
  packaging: number;
  mano: number;
  promoFee: number;
  multIng: number;
  multPack: number;
  multMano: number;
  multFee: number;
}

interface CalculatedRow {
  producto: string;
  pvpEff: number;
  baseSinIva: number;
  totalPlataforma: number;
  feeAplicado: number;
  neto: number;
  costeTotal: number;
  beneficio: number;
  margenPct: number;
  promoTipo: PromoType;
  promoValor: number;
}

// --- Helpers ---

const STORAGE_KEY = 'tphub-calculator-products';

const eur = (v: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v);

const promoLabel = (tipo: PromoType, val: number) => {
  if (tipo === 'pct') return `-${val}%`;
  if (tipo === '2x1') return '2x1';
  return '—';
};

const defaultForm: FormState = {
  producto: '',
  pvp: 19.99,
  ivaComida: 10,
  comisionPct: 30,
  ivaComisionPct: 21,
  baseComision: 'bruto',
  promoTipo: 'none',
  promoValor: 0,
  ingredientes: 2.65,
  packaging: 0.50,
  mano: 0.80,
  promoFee: 0.90,
  multIng: 2,
  multPack: 1,
  multMano: 1,
  multFee: 1,
};

function loadRows(): CalculatedRow[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveRows(rows: CalculatedRow[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

// --- Component ---

export function CalculatorPage() {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [rows, setRows] = useState<CalculatedRow[]>(loadRows);

  // Persist rows to localStorage
  useEffect(() => {
    saveRows(rows);
  }, [rows]);

  // Update a single form field
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

  // --- Reactive calculations ---
  const calc = useMemo(() => {
    const ivaComida = form.ivaComida / 100;
    const comisionPct = form.comisionPct / 100;
    const ivaComisionPct = form.ivaComisionPct / 100;

    // PVP efectivo
    let pvpEff = form.pvp;
    if (form.promoTipo === 'pct') {
      pvpEff = form.pvp * (1 - form.promoValor / 100);
    }

    // Base sin IVA comida
    const baseSinIva = pvpEff / (1 + ivaComida);

    // Base para comisión
    const baseComision = form.baseComision === 'bruto' ? pvpEff : baseSinIva;

    // Comisión + IVA comisión
    const comisionEur = baseComision * comisionPct;
    const ivaComisionEur = comisionEur * ivaComisionPct;
    const totalPlataforma = comisionEur + ivaComisionEur;

    // Fee aplicado
    const feeAplicado =
      form.promoTipo === '2x1'
        ? form.promoFee * Math.max(0, form.multFee)
        : form.promoFee;

    // Neto
    const neto = baseSinIva - totalPlataforma - feeAplicado;

    // Coste total
    let costeTotal: number;
    if (form.promoTipo === '2x1') {
      costeTotal =
        form.ingredientes * Math.max(0, form.multIng) +
        form.packaging * Math.max(0, form.multPack) +
        form.mano * Math.max(0, form.multMano);
    } else {
      costeTotal = form.ingredientes + form.packaging + form.mano;
    }

    const beneficio = neto - costeTotal;
    const margenPct = pvpEff > 0 ? (beneficio / pvpEff) * 100 : 0;

    return { pvpEff, baseSinIva, totalPlataforma, feeAplicado, neto, costeTotal, beneficio, margenPct };
  }, [form]);

  // --- Actions ---

  const handleAdd = useCallback(() => {
    const row: CalculatedRow = {
      producto: form.producto || 'Sin nombre',
      pvpEff: calc.pvpEff,
      baseSinIva: calc.baseSinIva,
      totalPlataforma: calc.totalPlataforma,
      feeAplicado: calc.feeAplicado,
      neto: calc.neto,
      costeTotal: calc.costeTotal,
      beneficio: calc.beneficio,
      margenPct: calc.margenPct,
      promoTipo: form.promoTipo,
      promoValor: form.promoValor,
    };
    setRows((prev) => [row, ...prev]);
  }, [form, calc]);

  const handleDeleteRow = useCallback((idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleClearTable = useCallback(() => {
    if (window.confirm('¿Borrar toda la tabla guardada?')) {
      setRows([]);
    }
  }, []);

  const handleExportCSV = useCallback(() => {
    if (!rows.length) return;
    const headers = ['Producto', 'PVP Eff.', 'Plataforma', 'Neto', 'Coste', 'Beneficio', 'Margen %', 'Promo'];
    const lines = [headers.join(';')];
    for (const r of rows) {
      lines.push(
        [
          `"${r.producto.replaceAll('"', '""')}"`,
          r.pvpEff.toFixed(2),
          r.totalPlataforma.toFixed(2),
          r.neto.toFixed(2),
          r.costeTotal.toFixed(2),
          r.beneficio.toFixed(2),
          r.margenPct.toFixed(1),
          promoLabel(r.promoTipo, r.promoValor),
        ].join(';'),
      );
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tphub_calculadora_delivery.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [rows]);

  // --- Margin color ---
  const marginColor =
    calc.margenPct >= 20
      ? 'text-emerald-600'
      : calc.margenPct >= 0
        ? 'text-amber-600'
        : 'text-red-600';

  const benefitColor =
    calc.beneficio >= 0 ? 'text-emerald-600' : 'text-red-600';

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calculadora Delivery</h1>
        <p className="text-sm text-gray-500 mt-1">
          Calcula el margen real de tus productos en plataformas de delivery
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ========== LEFT COLUMN: Form ========== */}
        <div className="lg:col-span-3 space-y-4">
          {/* Product & PVP */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Producto</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nombre del producto">
                <input
                  type="text"
                  value={form.producto}
                  onChange={(e) => set('producto', e.target.value)}
                  placeholder="Ej: Burger Queso"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </Field>
              <Field label="PVP (€) — precio al cliente con IVA">
                <input
                  type="number"
                  step="0.01"
                  value={form.pvp}
                  onChange={(e) => setNum('pvp', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </Field>
            </div>
          </div>

          {/* Taxes & Commission */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Impuestos y comisión</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="IVA comida (%)">
                <input
                  type="number"
                  step="0.01"
                  value={form.ivaComida}
                  onChange={(e) => setNum('ivaComida', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </Field>
              <Field label="Comisión (%)">
                <input
                  type="number"
                  step="0.01"
                  value={form.comisionPct}
                  onChange={(e) => setNum('comisionPct', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </Field>
              <Field label="IVA sobre comisión (%)">
                <input
                  type="number"
                  step="0.01"
                  value={form.ivaComisionPct}
                  onChange={(e) => setNum('ivaComisionPct', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Comisión calculada sobre...">
                <select
                  value={form.baseComision}
                  onChange={(e) => set('baseComision', e.target.value as CommissionBase)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="bruto">PVP con IVA comida</option>
                  <option value="neto">Base sin IVA comida</option>
                </select>
              </Field>
              <Field label="Tipo de promoción">
                <select
                  value={form.promoTipo}
                  onChange={(e) => set('promoTipo', e.target.value as PromoType)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="none">Sin promo</option>
                  <option value="pct">% descuento</option>
                  <option value="2x1">2x1</option>
                </select>
              </Field>
              {form.promoTipo === 'pct' && (
                <Field label="Descuento (%)">
                  <input
                    type="number"
                    step="0.01"
                    value={form.promoValor}
                    onChange={(e) => setNum('promoValor', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </Field>
              )}
            </div>
          </div>

          {/* Costs */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Costes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Field label="Ingredientes (€)">
                <input
                  type="number"
                  step="0.01"
                  value={form.ingredientes}
                  onChange={(e) => setNum('ingredientes', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </Field>
              <Field label="Packaging (€)">
                <input
                  type="number"
                  step="0.01"
                  value={form.packaging}
                  onChange={(e) => setNum('packaging', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </Field>
              <Field label="Mano de obra (€)">
                <input
                  type="number"
                  step="0.01"
                  value={form.mano}
                  onChange={(e) => setNum('mano', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </Field>
              <Field label="Fee promo (€/venta)">
                <input
                  type="number"
                  step="0.01"
                  value={form.promoFee}
                  onChange={(e) => setNum('promoFee', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </Field>
            </div>

            {/* 2x1 Multipliers */}
            {form.promoTipo === '2x1' && (
              <div className="bg-gray-50 rounded-lg border border-gray-100 p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-600">
                  Multiplicadores 2x1
                  <span className="ml-2 text-[10px] font-normal text-gray-400">
                    Ej: Ingredientes ×2, Packaging ×1 = solo duplicas ingredientes
                  </span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Field label="Ingredientes ×">
                    <input
                      type="number"
                      step="0.1"
                      value={form.multIng}
                      onChange={(e) => setNum('multIng', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </Field>
                  <Field label="Packaging ×">
                    <input
                      type="number"
                      step="0.1"
                      value={form.multPack}
                      onChange={(e) => setNum('multPack', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </Field>
                  <Field label="Mano de obra ×">
                    <input
                      type="number"
                      step="0.1"
                      value={form.multMano}
                      onChange={(e) => setNum('multMano', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </Field>
                  <Field label="Fee promo ×">
                    <input
                      type="number"
                      step="0.1"
                      value={form.multFee}
                      onChange={(e) => setNum('multFee', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </Field>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleAdd}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Agregar a tabla
            </button>
            <button
              onClick={handleExportCSV}
              disabled={!rows.length}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg font-medium text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
            <button
              onClick={handleClearTable}
              disabled={!rows.length}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-red-200 hover:bg-red-50 text-red-600 rounded-lg font-medium text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              Borrar tabla
            </button>
          </div>
        </div>

        {/* ========== RIGHT COLUMN: KPIs + Table ========== */}
        <div className="lg:col-span-2 space-y-4">
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3">
            <KpiCard
              label="PVP efectivo"
              value={eur(calc.pvpEff)}
              sub={promoLabel(form.promoTipo, form.promoValor)}
            />
            <KpiCard label="Base sin IVA" value={eur(calc.baseSinIva)} />
            <KpiCard label="Total plataforma" value={eur(calc.totalPlataforma)} />
            <KpiCard label="Fee promo" value={eur(calc.feeAplicado)} />
            <KpiCard label="Neto restaurante" value={eur(calc.neto)} />
            <KpiCard label="Coste total" value={eur(calc.costeTotal)} />
            <KpiCard
              label="Beneficio real"
              value={eur(calc.beneficio)}
              valueClassName={benefitColor}
            />
            <KpiCard
              label="Margen %"
              value={`${calc.margenPct.toFixed(1)}%`}
              valueClassName={marginColor}
            />
          </div>

          {/* Saved products table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">
                Productos guardados
                {rows.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    {rows.length} {rows.length === 1 ? 'producto' : 'productos'}
                  </span>
                )}
              </h3>
            </div>

            {rows.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">
                Agrega productos con el botón "Agregar a tabla"
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                      <th className="px-4 py-2.5 text-left font-medium">Producto</th>
                      <th className="px-3 py-2.5 text-right font-medium">PVP eff.</th>
                      <th className="px-3 py-2.5 text-right font-medium">Plataf.</th>
                      <th className="px-3 py-2.5 text-right font-medium">Neto</th>
                      <th className="px-3 py-2.5 text-right font-medium">Coste</th>
                      <th className="px-3 py-2.5 text-right font-medium">Benef.</th>
                      <th className="px-3 py-2.5 text-right font-medium">Margen</th>
                      <th className="px-3 py-2.5 text-center font-medium">Promo</th>
                      <th className="px-2 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, idx) => {
                      const rowMarginColor =
                        r.margenPct >= 20
                          ? 'text-emerald-600'
                          : r.margenPct >= 0
                            ? 'text-amber-600'
                            : 'text-red-600';
                      return (
                        <tr
                          key={idx}
                          className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="px-4 py-2.5 font-medium text-gray-900 max-w-[140px] truncate">
                            {r.producto}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">
                            {eur(r.pvpEff)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">
                            {eur(r.totalPlataforma)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">
                            {eur(r.neto)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">
                            {eur(r.costeTotal)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">
                            {eur(r.beneficio)}
                          </td>
                          <td className={`px-3 py-2.5 text-right tabular-nums font-semibold ${rowMarginColor}`}>
                            {r.margenPct.toFixed(1)}%
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] border border-gray-200 bg-gray-50 text-gray-500">
                              {promoLabel(r.promoTipo, r.promoValor)}
                            </span>
                          </td>
                          <td className="px-2 py-2.5">
                            <button
                              onClick={() => handleDeleteRow(idx)}
                              className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                              title="Eliminar fila"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Hint */}
          <p className="text-xs text-gray-400 px-1">
            Los productos se guardan en tu navegador (localStorage).
          </p>
        </div>
      </div>
    </div>
  );
}

// --- Sub-components ---

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  valueClassName,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClassName?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${valueClassName ?? 'text-gray-900'}`}>
        {value}
      </p>
      {sub && sub !== '—' && (
        <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
      )}
    </div>
  );
}
