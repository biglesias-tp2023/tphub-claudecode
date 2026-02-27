import { useState, useMemo, useCallback, useEffect } from 'react';
import { Plus, Trash2, X, Package, Percent, Coins, ShoppingBag } from 'lucide-react';
import { Field, HeroKpi, WaterfallBreakdown, eur, INPUT_CLASS } from './components';
import type { WaterfallLine } from './components';
import { useSessionState } from '@/hooks/useSessionState';
import { ExportButtons, type ExportFormat } from '@/components/common/ExportButtons';
import type { PreviewTableData } from '@/components/common/ExportPreviewModal';
import {
  exportCalculatorDeliveryToCSV,
  exportCalculatorDeliveryToExcel,
  exportCalculatorDeliveryToPDF,
  generateCalculatorDeliveryPdfBlob,
} from '@/utils/export';
import type { CalculatorDeliveryExportData } from '@/utils/export';

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

export function DeliveryMarginCalc() {
  const [form, setForm] = useSessionState<FormState>('tphub-calc-delivery', defaultForm);
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

    // IVA comida amount
    const ivaComidaEur = pvpEff - baseSinIva;

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

    return { pvpEff, baseSinIva, totalPlataforma, ivaComidaEur, feeAplicado, neto, costeTotal, beneficio, margenPct };
  }, [form]);

  // --- Waterfall lines ---
  const waterfallLines: WaterfallLine[] = useMemo(() => [
    { label: 'PVP efectivo', value: calc.pvpEff, type: 'income' },
    { label: 'IVA comida', value: calc.ivaComidaEur, type: 'deduction' },
    { label: 'Base sin IVA', value: calc.baseSinIva, type: 'subtotal' },
    { label: 'Comision + IVA', value: calc.totalPlataforma, type: 'deduction' },
    { label: 'Fee promo', value: calc.feeAplicado, type: 'deduction' },
    { label: 'Neto restaurante', value: calc.neto, type: 'subtotal' },
    { label: 'Ingredientes', value: form.promoTipo === '2x1' ? form.ingredientes * Math.max(0, form.multIng) : form.ingredientes, type: 'deduction' },
    { label: 'Packaging', value: form.promoTipo === '2x1' ? form.packaging * Math.max(0, form.multPack) : form.packaging, type: 'deduction' },
    { label: 'Mano de obra', value: form.promoTipo === '2x1' ? form.mano * Math.max(0, form.multMano) : form.mano, type: 'deduction' },
    { label: 'Beneficio real', value: calc.beneficio, type: 'result' },
  ], [calc, form]);

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

  // --- Export ---

  const buildExportData = useCallback((): CalculatorDeliveryExportData => ({
    products: rows,
  }), [rows]);

  const handleExport = useCallback((format: ExportFormat) => {
    const data = buildExportData();
    if (format === 'csv') exportCalculatorDeliveryToCSV(data);
    else if (format === 'excel') exportCalculatorDeliveryToExcel(data);
    else exportCalculatorDeliveryToPDF(data);
  }, [buildExportData]);

  const getPreviewData = useCallback((): PreviewTableData => ({
    headers: ['Producto', 'PVP Eff.', 'Plataf.', 'Neto', 'Coste', 'Benef.', 'Margen', 'Promo'],
    rows: rows.map((r) => [
      r.producto,
      eur(r.pvpEff),
      eur(r.totalPlataforma),
      eur(r.neto),
      eur(r.costeTotal),
      eur(r.beneficio),
      `${r.margenPct.toFixed(1)}%`,
      promoLabel(r.promoTipo, r.promoValor),
    ]),
  }), [rows]);

  const generatePdfBlob = useCallback(() => {
    return generateCalculatorDeliveryPdfBlob(buildExportData());
  }, [buildExportData]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* ========== LEFT COLUMN: Form ========== */}
      <div className="lg:col-span-3 space-y-4">
        {/* Product & PVP */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
            <Package className="w-4 h-4 text-primary-500" />
            Producto
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre del producto">
              <input
                type="text"
                value={form.producto}
                onChange={(e) => set('producto', e.target.value)}
                placeholder="Ej: Burger Queso"
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="PVP (€) — precio al cliente con IVA">
              <input
                type="number"
                step="0.01"
                value={form.pvp}
                onChange={(e) => setNum('pvp', e.target.value)}
                className={INPUT_CLASS}
              />
            </Field>
          </div>
        </div>

        {/* Taxes & Commission */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
            <Percent className="w-4 h-4 text-primary-500" />
            Impuestos y comision
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="IVA comida (%)">
              <input
                type="number"
                step="0.01"
                value={form.ivaComida}
                onChange={(e) => setNum('ivaComida', e.target.value)}
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="Comision (%)">
              <input
                type="number"
                step="0.01"
                value={form.comisionPct}
                onChange={(e) => setNum('comisionPct', e.target.value)}
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="IVA sobre comision (%)">
              <input
                type="number"
                step="0.01"
                value={form.ivaComisionPct}
                onChange={(e) => setNum('ivaComisionPct', e.target.value)}
                className={INPUT_CLASS}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Comision calculada sobre...">
              <select
                value={form.baseComision}
                onChange={(e) => set('baseComision', e.target.value as CommissionBase)}
                className={INPUT_CLASS}
              >
                <option value="bruto">PVP con IVA comida</option>
                <option value="neto">Base sin IVA comida</option>
              </select>
            </Field>
            <Field label="Tipo de promocion">
              <select
                value={form.promoTipo}
                onChange={(e) => set('promoTipo', e.target.value as PromoType)}
                className={INPUT_CLASS}
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
                  className={INPUT_CLASS}
                />
              </Field>
            )}
          </div>
        </div>

        {/* Costs */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
            <Coins className="w-4 h-4 text-primary-500" />
            Costes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Field label="Ingredientes (€)">
              <input
                type="number"
                step="0.01"
                value={form.ingredientes}
                onChange={(e) => setNum('ingredientes', e.target.value)}
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="Packaging (€)">
              <input
                type="number"
                step="0.01"
                value={form.packaging}
                onChange={(e) => setNum('packaging', e.target.value)}
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="Mano de obra (€)">
              <input
                type="number"
                step="0.01"
                value={form.mano}
                onChange={(e) => setNum('mano', e.target.value)}
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="Fee promo (€/venta)">
              <input
                type="number"
                step="0.01"
                value={form.promoFee}
                onChange={(e) => setNum('promoFee', e.target.value)}
                className={INPUT_CLASS}
              />
            </Field>
          </div>

          {/* 2x1 Multipliers */}
          {form.promoTipo === '2x1' && (
            <div className="bg-gray-50 rounded-lg border border-gray-100 p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-600">
                Multiplicadores 2x1
                <span className="ml-2 text-[10px] font-normal text-gray-400">
                  Ej: Ingredientes x2, Packaging x1 = solo duplicas ingredientes
                </span>
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Field label="Ingredientes x">
                  <input
                    type="number"
                    step="0.1"
                    value={form.multIng}
                    onChange={(e) => setNum('multIng', e.target.value)}
                    className={INPUT_CLASS}
                  />
                </Field>
                <Field label="Packaging x">
                  <input
                    type="number"
                    step="0.1"
                    value={form.multPack}
                    onChange={(e) => setNum('multPack', e.target.value)}
                    className={INPUT_CLASS}
                  />
                </Field>
                <Field label="Mano de obra x">
                  <input
                    type="number"
                    step="0.1"
                    value={form.multMano}
                    onChange={(e) => setNum('multMano', e.target.value)}
                    className={INPUT_CLASS}
                  />
                </Field>
                <Field label="Fee promo x">
                  <input
                    type="number"
                    step="0.1"
                    value={form.multFee}
                    onChange={(e) => setNum('multFee', e.target.value)}
                    className={INPUT_CLASS}
                  />
                </Field>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Agregar a tabla
          </button>
          <ExportButtons
            onExport={handleExport}
            getPreviewData={rows.length > 0 ? getPreviewData : undefined}
            generatePdfBlob={rows.length > 0 ? generatePdfBlob : undefined}
            previewTitle="Calculadora Delivery"
            previewSubtitle={`${rows.length} productos`}
            disabled={!rows.length}
            variant="dropdown"
            size="sm"
          />
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

      {/* ========== RIGHT COLUMN: Hero KPIs + Waterfall + Table ========== */}
      <div className="lg:col-span-2 space-y-4">
        {/* Hero KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <HeroKpi
            label="Beneficio real"
            value={eur(calc.beneficio)}
            positive={calc.beneficio >= 0}
          />
          <HeroKpi
            label="Margen %"
            value={`${calc.margenPct.toFixed(1)}%`}
            positive={calc.margenPct >= 0}
          />
        </div>

        {/* Waterfall breakdown */}
        <WaterfallBreakdown lines={waterfallLines} />

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
            <div className="px-5 py-10 text-center">
              <ShoppingBag className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500 mb-1">Sin productos guardados</p>
              <p className="text-xs text-gray-400">
                Configura un producto y pulsa "Agregar a tabla" para comparar margenes
              </p>
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
  );
}
