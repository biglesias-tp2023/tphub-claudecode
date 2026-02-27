import { useMemo, useCallback } from 'react';
import { Eye, ArrowRightLeft, PiggyBank } from 'lucide-react';
import { Field, KpiCard, eur, pct, INPUT_CLASS } from './components';
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

  // --- Colors ---
  const roiColor = calc.roi >= 100 ? 'text-emerald-600' : calc.roi >= 0 ? 'text-amber-600' : 'text-red-600';
  const benefitColor = calc.beneficioNeto >= 0 ? 'text-emerald-600' : 'text-red-600';

  const varColor = (v: number) => (v > 0 ? 'text-emerald-600' : v < 0 ? 'text-red-600' : 'text-gray-500');
  const varSign = (v: number) => (v > 0 ? '+' : '');

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

  const getPreviewData = useCallback((): PreviewTableData => ({
    headers: ['Metrica', 'Pre', 'Post', 'Variacion'],
    rows: [
      ['Visitas', form.visitas.toLocaleString('es-ES'), form.visitas.toLocaleString('es-ES'), '—'],
      ['CR', pct(form.crPre), pct(form.crPost), `${varSign(form.crPost - form.crPre)}${(form.crPost - form.crPre).toFixed(1)} pp`],
      ['Pedidos', Math.round(calc.pedidosPre).toLocaleString('es-ES'), Math.round(calc.pedidosPost).toLocaleString('es-ES'), `${varSign(calc.deltaPedidosPct)}${calc.deltaPedidosPct.toFixed(1)}%`],
      ['Venta bruta', eur(calc.ventaPre), eur(calc.ventaPost), `${varSign(calc.deltaVentaPct)}${calc.deltaVentaPct.toFixed(1)}%`],
      ['Margen', eur(calc.margenPre), eur(calc.margenPost), `${varSign(calc.deltaMargenPct)}${calc.deltaMargenPct.toFixed(1)}%`],
      ['', '', '', ''],
      [`Beneficio neto (${form.horizonte}m)`, '', eur(calc.beneficioNeto), `ROI: ${pct(calc.roi)}`],
    ],
  }), [form, calc]);

  const generatePdfBlob = useCallback(() => {
    return generateCalculatorPhotoPdfBlob(buildExportData());
  }, [buildExportData]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* ========== LEFT COLUMN: Form ========== */}
      <div className="lg:col-span-2 space-y-4">
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
      </div>

      {/* ========== RIGHT COLUMN: Results ========== */}
      <div className="lg:col-span-3 space-y-4">
        {/* KPI cards destacados */}
        <div className="grid grid-cols-2 gap-3">
          <KpiCard
            label="Beneficio neto"
            value={eur(calc.beneficioNeto)}
            sub={`Margen adicional − ${eur(form.costeSesion)} coste sesion`}
            valueClassName={benefitColor}
          />
          <KpiCard
            label="ROI"
            value={pct(calc.roi)}
            sub={`Retorno sobre ${eur(form.costeSesion)} invertidos`}
            valueClassName={roiColor}
          />
        </div>

        {/* Comparativa mensual */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Comparativa mensual</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-5 py-2.5 text-left font-medium">Metrica</th>
                  <th className="px-4 py-2.5 text-right font-medium">Pre</th>
                  <th className="px-4 py-2.5 text-right font-medium">Post</th>
                  <th className="px-4 py-2.5 text-right font-medium">Variacion</th>
                </tr>
              </thead>
              <tbody>
                <CompRow label="Visitas" pre={form.visitas.toLocaleString('es-ES')} post={form.visitas.toLocaleString('es-ES')} variation="—" />
                <CompRow label="CR" pre={pct(form.crPre)} post={pct(form.crPost)} variation={`${varSign(form.crPost - form.crPre)}${(form.crPost - form.crPre).toFixed(1)} pp`} varClass={varColor(form.crPost - form.crPre)} />
                <CompRow label="Ticket medio" pre={eur(form.ticketMedio)} post={eur(form.ticketMedio)} variation="—" />
                <CompRow label="Pedidos" pre={Math.round(calc.pedidosPre).toLocaleString('es-ES')} post={Math.round(calc.pedidosPost).toLocaleString('es-ES')} variation={`${varSign(calc.deltaPedidosPct)}${calc.deltaPedidosPct.toFixed(1)}%`} varClass={varColor(calc.deltaPedidos)} />
                <CompRow label="Venta bruta" pre={eur(calc.ventaPre)} post={eur(calc.ventaPost)} variation={`${varSign(calc.deltaVentaPct)}${calc.deltaVentaPct.toFixed(1)}%`} varClass={varColor(calc.deltaVenta)} />
                <CompRow label="Margen" pre={eur(calc.margenPre)} post={eur(calc.margenPost)} variation={`${varSign(calc.deltaMargenPct)}${calc.deltaMargenPct.toFixed(1)}%`} varClass={varColor(calc.deltaMargen)} last />
              </tbody>
            </table>
          </div>
        </div>

        {/* Proyección a N meses */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">
              Proyeccion a {form.horizonte} {form.horizonte === 1 ? 'mes' : 'meses'}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-5 py-2.5 text-left font-medium">Concepto</th>
                  <th className="px-4 py-2.5 text-right font-medium">Sin sesion</th>
                  <th className="px-4 py-2.5 text-right font-medium">Con sesion</th>
                  <th className="px-4 py-2.5 text-right font-medium">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                <CompRow label="Venta bruta" pre={eur(calc.ventaPreN)} post={eur(calc.ventaPostN)} variation={`${varSign(calc.ventaPostN - calc.ventaPreN)}${eur(calc.ventaPostN - calc.ventaPreN)}`} varClass={varColor(calc.ventaPostN - calc.ventaPreN)} />
                <CompRow label="Margen" pre={eur(calc.margenPreN)} post={eur(calc.margenPostN)} variation={`${varSign(calc.margenPostN - calc.margenPreN)}${eur(calc.margenPostN - calc.margenPreN)}`} varClass={varColor(calc.margenPostN - calc.margenPreN)} />
                <tr className="border-b border-gray-50 bg-gray-50/50">
                  <td className="px-5 py-2.5 text-gray-700 font-medium">Coste sesion</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-400">—</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-red-600 font-medium">{eur(form.costeSesion)}</td>
                  <td className="px-4 py-2.5" />
                </tr>
                <tr className="bg-primary-50/50">
                  <td className="px-5 py-2.5 text-gray-900 font-semibold">Beneficio neto</td>
                  <td className="px-4 py-2.5" />
                  <td className={`px-4 py-2.5 text-right tabular-nums font-bold ${benefitColor}`}>{eur(calc.beneficioNeto)}</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums font-bold ${roiColor}`}>ROI: {pct(calc.roi)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Export + Hint */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400 px-1">
            Todos los calculos son estimaciones basadas en los datos introducidos.
          </p>
          <ExportButtons
            onExport={handleExport}
            getPreviewData={getPreviewData}
            generatePdfBlob={generatePdfBlob}
            previewTitle="Calculadora Sesion de Fotos"
            previewSubtitle={`Horizonte: ${form.horizonte} meses`}
            variant="ghost"
            size="sm"
          />
        </div>
      </div>
    </div>
  );
}

// --- Sub-component ---

function CompRow({
  label,
  pre,
  post,
  variation,
  varClass,
  last,
}: {
  label: string;
  pre: string;
  post: string;
  variation: string;
  varClass?: string;
  last?: boolean;
}) {
  return (
    <tr className={last ? '' : 'border-b border-gray-50'}>
      <td className="px-5 py-2.5 text-gray-700 font-medium">{label}</td>
      <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">{pre}</td>
      <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">{post}</td>
      <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${varClass ?? 'text-gray-400'}`}>{variation}</td>
    </tr>
  );
}
