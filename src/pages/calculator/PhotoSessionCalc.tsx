import { useMemo, useCallback } from 'react';
import { Eye, ArrowRightLeft, PiggyBank } from 'lucide-react';
import { Field, HeroKpi, WaterfallBreakdown, eur, pct, INPUT_CLASS } from './components';
import type { WaterfallLine } from './components';
import { useSessionState } from '@/hooks/useSessionState';
import { ExportButtons, type ExportFormat } from '@/components/common/ExportButtons';
import type { PreviewTableData } from '@/components/common/ExportPreviewModal';
import {
  exportCalculatorPhotoToCSV,
  exportCalculatorPhotoToExcel,
  exportCalculatorPhotoToPDF,
  generateCalculatorPhotoPdfBlob,
} from '@/utils/export';
import type { CalculatorPhotoExportData } from '@/utils/export';

// --- Types ---

interface FormState {
  visitas: number;
  crPre: number;
  crPost: number;
  ticketMedio: number;
  margen: number;
  costeSesion: number;
  horizonte: number;
}

// --- Helpers ---

const defaultForm: FormState = {
  visitas: 50000,
  crPre: 3,
  crPost: 4.5,
  ticketMedio: 18,
  margen: 25,
  costeSesion: 350,
  horizonte: 6,
};

// --- Component ---

export function PhotoSessionCalc() {
  const [form, setForm] = useSessionState<FormState>('tphub-calc-photo', defaultForm);

  const setNum = useCallback(
    (key: keyof FormState, raw: string) => {
      const n = Number(raw);
      if (Number.isFinite(n)) setForm((prev) => ({ ...prev, [key]: n }));
    },
    [],
  );

  // --- Reactive calculations ---
  const calc = useMemo(() => {
    const crPreDec = form.crPre / 100;
    const crPostDec = form.crPost / 100;
    const margenDec = form.margen / 100;

    // Mensual
    const pedidosPre = form.visitas * crPreDec;
    const pedidosPost = form.visitas * crPostDec;
    const ventaPre = pedidosPre * form.ticketMedio;
    const ventaPost = pedidosPost * form.ticketMedio;
    const margenPre = ventaPre * margenDec;
    const margenPost = ventaPost * margenDec;

    // Variación mensual
    const deltaPedidos = pedidosPost - pedidosPre;
    const deltaVenta = ventaPost - ventaPre;
    const deltaMargen = margenPost - margenPre;

    // Variación % mensual
    const deltaPedidosPct = pedidosPre > 0 ? (deltaPedidos / pedidosPre) * 100 : 0;
    const deltaVentaPct = ventaPre > 0 ? (deltaVenta / ventaPre) * 100 : 0;
    const deltaMargenPct = margenPre > 0 ? (deltaMargen / margenPre) * 100 : 0;

    // Proyección a N meses
    const ventaPreN = ventaPre * form.horizonte;
    const ventaPostN = ventaPost * form.horizonte;
    const margenPreN = margenPre * form.horizonte;
    const margenPostN = margenPost * form.horizonte;

    // ROI
    const beneficioNeto = margenPostN - margenPreN - form.costeSesion;
    const roi = form.costeSesion > 0 ? (beneficioNeto / form.costeSesion) * 100 : 0;

    return {
      pedidosPre, pedidosPost, ventaPre, ventaPost, margenPre, margenPost,
      deltaPedidos, deltaVenta, deltaMargen,
      deltaPedidosPct, deltaVentaPct, deltaMargenPct,
      ventaPreN, ventaPostN, margenPreN, margenPostN,
      beneficioNeto, roi,
    };
  }, [form]);


  // --- Waterfall lines (projection breakdown) ---
  const waterfallLines: WaterfallLine[] = useMemo(() => [
    { label: `Venta post (${form.horizonte}m)`, value: calc.ventaPostN, type: 'income' },
    { label: `Venta pre (${form.horizonte}m)`, value: calc.ventaPreN, type: 'deduction' },
    { label: 'Incremento ventas', value: calc.ventaPostN - calc.ventaPreN, type: 'subtotal' },
    { label: `Margen (${form.margen}%)`, value: (calc.ventaPostN - calc.ventaPreN) * (form.margen / 100), type: 'subtotal' },
    { label: 'Coste sesion', value: form.costeSesion, type: 'deduction' },
    { label: 'Beneficio neto', value: calc.beneficioNeto, type: 'result' },
  ], [calc, form]);

  // --- Export ---

  const buildExportData = useCallback((): CalculatorPhotoExportData => ({
    inputs: { ...form },
    monthly: {
      pedidosPre: calc.pedidosPre,
      pedidosPost: calc.pedidosPost,
      ventaPre: calc.ventaPre,
      ventaPost: calc.ventaPost,
      margenPre: calc.margenPre,
      margenPost: calc.margenPost,
    },
    projection: {
      ventaPreN: calc.ventaPreN,
      ventaPostN: calc.ventaPostN,
      margenPreN: calc.margenPreN,
      margenPostN: calc.margenPostN,
      beneficioNeto: calc.beneficioNeto,
      roi: calc.roi,
    },
  }), [form, calc]);

  const handleExport = useCallback((format: ExportFormat) => {
    const data = buildExportData();
    if (format === 'csv') exportCalculatorPhotoToCSV(data);
    else if (format === 'excel') exportCalculatorPhotoToExcel(data);
    else exportCalculatorPhotoToPDF(data);
  }, [buildExportData]);

  const getPreviewData = useCallback((): PreviewTableData => {
    const monthHeaders = Array.from({ length: form.horizonte }, (_, i) => `Mes ${i + 1}`);
    const rows: string[][] = [];
    const deltaM = calc.deltaMargen;
    const margenRow = ['Δ Margen', ...monthHeaders.map(() => `+${eur(deltaM)}`), `+${eur(deltaM * form.horizonte)}`];
    const costeRow = ['Coste sesion', `-${eur(form.costeSesion)}`, ...monthHeaders.slice(1).map(() => '—'), `-${eur(form.costeSesion)}`];
    const benefRow = ['Beneficio mes'];
    const acumRow = ['Acumulado'];
    let acum = 0;
    for (let i = 1; i <= form.horizonte; i++) {
      const coste = i === 1 ? form.costeSesion : 0;
      const ben = deltaM - coste;
      acum += ben;
      benefRow.push(eur(ben));
      acumRow.push(eur(acum));
    }
    benefRow.push(eur(calc.beneficioNeto));
    acumRow.push('');
    rows.push(margenRow, costeRow, benefRow, acumRow);
    return { headers: ['Concepto', ...monthHeaders, 'Total'], rows };
  }, [form, calc]);

  const generatePdfBlob = useCallback(() => {
    return generateCalculatorPhotoPdfBlob(buildExportData());
  }, [buildExportData]);

  // --- Monthly timeline data ---
  const months = useMemo(() => {
    const arr: { month: number; deltaMargen: number; coste: number; beneficioMes: number; acumulado: number }[] = [];
    let acum = 0;
    for (let i = 1; i <= form.horizonte; i++) {
      const coste = i === 1 ? form.costeSesion : 0;
      const beneficio = calc.deltaMargen - coste;
      acum += beneficio;
      arr.push({ month: i, deltaMargen: calc.deltaMargen, coste, beneficioMes: beneficio, acumulado: acum });
    }
    return arr;
  }, [form.horizonte, form.costeSesion, calc.deltaMargen]);

  const totals = useMemo(() => ({
    deltaMargen: calc.deltaMargen * form.horizonte,
    coste: form.costeSesion,
    beneficio: calc.beneficioNeto,
  }), [calc, form]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ========== LEFT COLUMN: Form ========== */}
        <div className="lg:col-span-3 space-y-4">
          {/* Datos del establecimiento */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary-500" />
              Datos del establecimiento
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Visitas mensuales">
                <input
                  type="number"
                  step="100"
                  value={form.visitas}
                  onChange={(e) => setNum('visitas', e.target.value)}
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Ticket medio (€)">
                <input
                  type="number"
                  step="0.5"
                  value={form.ticketMedio}
                  onChange={(e) => setNum('ticketMedio', e.target.value)}
                  className={INPUT_CLASS}
                />
              </Field>
            </div>
          </div>

          {/* Conversión */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-primary-500" />
              Conversion
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="CR pre-sesion (%)">
                <input
                  type="number"
                  step="0.1"
                  value={form.crPre}
                  onChange={(e) => setNum('crPre', e.target.value)}
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="CR post-sesion (%)">
                <input
                  type="number"
                  step="0.1"
                  value={form.crPost}
                  onChange={(e) => setNum('crPost', e.target.value)}
                  className={INPUT_CLASS}
                />
              </Field>
            </div>
          </div>

          {/* Márgenes e inversión */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              <PiggyBank className="w-4 h-4 text-primary-500" />
              Margenes e inversion
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <Field label="Margen del restaurante (%)">
                <input
                  type="number"
                  step="0.5"
                  value={form.margen}
                  onChange={(e) => setNum('margen', e.target.value)}
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Coste sesion de fotos (€)">
                <input
                  type="number"
                  step="10"
                  value={form.costeSesion}
                  onChange={(e) => setNum('costeSesion', e.target.value)}
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Horizonte de proyeccion (meses)">
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="24"
                  value={form.horizonte}
                  onChange={(e) => setNum('horizonte', e.target.value)}
                  className={INPUT_CLASS}
                />
              </Field>
            </div>
          </div>

          {/* Export */}
          <div className="flex items-center gap-3">
            <ExportButtons
              onExport={handleExport}
              getPreviewData={getPreviewData}
              generatePdfBlob={generatePdfBlob}
              previewTitle="Calculadora Sesion de Fotos"
              previewSubtitle={`Horizonte: ${form.horizonte} meses`}
              variant="dropdown"
              size="sm"
            />
          </div>
        </div>

        {/* ========== RIGHT COLUMN: Results ========== */}
        <div className="lg:col-span-2 space-y-4">
          {/* Hero KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <HeroKpi
              label="Beneficio neto"
              value={eur(calc.beneficioNeto)}
              positive={calc.beneficioNeto >= 0}
            />
            <HeroKpi
              label="ROI"
              value={pct(calc.roi)}
              positive={calc.roi >= 0}
            />
          </div>

          {/* Waterfall: Projection breakdown */}
          <WaterfallBreakdown lines={waterfallLines} pctBase={calc.ventaPostN} />

          {/* Hint */}
          <p className="text-xs text-gray-400 px-1">
            Todos los calculos son estimaciones basadas en los datos introducidos.
          </p>
        </div>
      </div>

      {/* ========== FULL-WIDTH: Monthly timeline ========== */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">
            Impacto mensual
            <span className="ml-2 text-xs font-normal text-gray-400">
              Proyeccion a {form.horizonte} {form.horizonte === 1 ? 'mes' : 'meses'}
            </span>
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-2.5 text-left font-medium sticky left-0 bg-white z-10">Concepto</th>
                {months.map((m) => (
                  <th key={m.month} className="px-3 py-2.5 text-right font-medium whitespace-nowrap">
                    Mes {m.month}
                  </th>
                ))}
                <th className="px-4 py-2.5 text-right font-medium bg-gray-50">Total</th>
              </tr>
            </thead>
            <tbody>
              {/* Incremento margen */}
              <tr className="border-b border-gray-50">
                <td className="px-4 py-2.5 text-gray-700 font-medium sticky left-0 bg-white z-10">Δ Margen</td>
                {months.map((m) => (
                  <td key={m.month} className="px-3 py-2.5 text-right tabular-nums text-emerald-600 whitespace-nowrap">
                    +{eur(m.deltaMargen)}
                  </td>
                ))}
                <td className="px-4 py-2.5 text-right tabular-nums text-emerald-700 font-semibold bg-gray-50 whitespace-nowrap">
                  +{eur(totals.deltaMargen)}
                </td>
              </tr>
              {/* Coste sesión */}
              <tr className="border-b border-gray-50">
                <td className="px-4 py-2.5 text-gray-700 font-medium sticky left-0 bg-white z-10">Coste sesion</td>
                {months.map((m) => (
                  <td key={m.month} className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">
                    {m.coste > 0 ? (
                      <span className="text-red-500">−{eur(m.coste)}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                ))}
                <td className="px-4 py-2.5 text-right tabular-nums text-red-500 font-semibold bg-gray-50 whitespace-nowrap">
                  −{eur(totals.coste)}
                </td>
              </tr>
              {/* Beneficio mes */}
              <tr className="border-b border-gray-100 bg-gray-50/30">
                <td className="px-4 py-2.5 text-gray-900 font-semibold sticky left-0 bg-gray-50/30 z-10">Beneficio mes</td>
                {months.map((m) => (
                  <td key={m.month} className={`px-3 py-2.5 text-right tabular-nums font-semibold whitespace-nowrap ${m.beneficioMes >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {m.beneficioMes >= 0 ? '+' : ''}{eur(m.beneficioMes)}
                  </td>
                ))}
                <td className={`px-4 py-2.5 text-right tabular-nums font-bold bg-gray-50 whitespace-nowrap ${totals.beneficio >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {totals.beneficio >= 0 ? '+' : ''}{eur(totals.beneficio)}
                </td>
              </tr>
              {/* Acumulado */}
              <tr>
                <td className="px-4 py-2.5 text-gray-900 font-semibold sticky left-0 bg-white z-10">Acumulado</td>
                {months.map((m) => (
                  <td key={m.month} className={`px-3 py-2.5 text-right tabular-nums font-bold whitespace-nowrap ${m.acumulado >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {m.acumulado >= 0 ? '+' : ''}{eur(m.acumulado)}
                  </td>
                ))}
                <td className="px-4 py-2.5 bg-gray-50" />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

