/**
 * WeeklyReportPage — main page for generating weekly/monthly client reports.
 */

import { useState, useCallback, useMemo } from 'react';
import { Wand2 } from 'lucide-react';
import { Select } from '@/components/ui';
import { useCompanyIds } from '@/stores/globalFiltersStore';
import { useCompanies } from '@/features/clients/hooks/useCompanies';
import { useWeeklyReportData } from '@/features/reports/hooks/useWeeklyReportData';
import { useMonthlyReportData } from '@/features/reports/hooks/useMonthlyReportData';
import { WeekPicker } from '@/features/reports/components/WeekPicker';
import { ReportPreview } from '@/features/reports/components/ReportPreview';
import { MonthlyReportPreview } from '@/features/reports/components/MonthlyReportPreview';
import { CopyEmailButton } from '@/features/reports/components/CopyEmailButton';
import { buildWeeklyReportHtml } from '@/features/reports/utils/weeklyReportHtml';
import { buildMonthlyReportHtml } from '@/features/reports/utils/monthlyReportHtml';
import { getLastNWeeks, type WeekRange } from '@/utils/dateUtils';
import type { InvestmentDecisionMap, InvestmentDecisionValue, ReportComments, MonthlyReportComments } from '@/features/reports/types';
import { cn } from '@/utils/cn';

type ReportMode = 'weekly' | 'monthly';

interface MonthOption {
  value: string; // YYYY-MM
  label: string;
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

function getLastNMonths(n: number): MonthOption[] {
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const today = new Date();
  const result: MonthOption[] = [];

  for (let i = 1; i <= n; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();

    result.unshift({
      value: `${year}-${String(month + 1).padStart(2, '0')}`,
      label: `${months[month]} ${year}`,
      start: `${year}-${String(month + 1).padStart(2, '0')}-01`,
      end: `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
    });
  }
  return result;
}

export function WeeklyReportPage() {
  const companyIds = useCompanyIds();
  const { data: companies = [] } = useCompanies();

  const defaultWeek = useMemo(() => getLastNWeeks(4).at(-1) ?? null, []);
  const monthOptions = useMemo(() => getLastNMonths(3), []);

  const [mode, setMode] = useState<ReportMode>('weekly');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedWeek, setSelectedWeek] = useState<WeekRange | null>(defaultWeek);
  const [selectedMonth, setSelectedMonth] = useState<string>(monthOptions.at(-1)?.value ?? '');
  const [generateTrigger, setGenerateTrigger] = useState(0);
  const [weeklyGenTrigger, setWeeklyGenTrigger] = useState(0);
  const [monthlyGenTrigger, setMonthlyGenTrigger] = useState(0);
  const [decisions, setDecisions] = useState<InvestmentDecisionMap>(new Map());
  const [subjectCopied, setSubjectCopied] = useState(false);
  const [comments, setComments] = useState<ReportComments>({ general: '', alerts: '', ads: '', detail: '' });
  const [monthlyComments, setMonthlyComments] = useState<MonthlyReportComments>({ executiveNarrative: '', actionPlan: [] });

  // Filter companies to only those selected in global filters
  const availableCompanies = useMemo(() => {
    if (companyIds.length === 0) return companies;
    return companies.filter((c) => companyIds.includes(c.id));
  }, [companies, companyIds]);

  const companyOptions = useMemo(
    () => availableCompanies.map((c) => ({ value: c.id, label: c.name })),
    [availableCompanies],
  );

  const monthSelectOptions = useMemo(
    () => monthOptions.map((m) => ({ value: m.value, label: m.label })),
    [monthOptions],
  );

  // Auto-select if only one company
  const effectiveCompanyId = selectedCompanyId || (availableCompanies.length === 1 ? availableCompanies[0].id : '');
  const selectedCompany = availableCompanies.find((c) => c.id === effectiveCompanyId);

  // Compute start/end based on mode
  const weekStart = selectedWeek?.start ?? '';
  const weekEnd = selectedWeek?.end ?? '';
  const monthOpt = monthOptions.find((m) => m.value === selectedMonth);
  const monthStart = monthOpt?.start ?? '';
  const monthEnd = monthOpt?.end ?? '';

  // Weekly hook
  const { data: weeklyData, isLoading: isLoadingWeekly, error: weeklyError } = useWeeklyReportData({
    companyId: effectiveCompanyId,
    companyName: selectedCompany?.name ?? '',
    weekStart,
    weekEnd,
    enabled: weeklyGenTrigger > 0 && mode === 'weekly' && !!effectiveCompanyId && !!weekStart,
  });

  // Monthly hook
  const { data: monthlyData, isLoading: isLoadingMonthly, error: monthlyError } = useMonthlyReportData({
    companyId: effectiveCompanyId,
    companyName: selectedCompany?.name ?? '',
    monthStart,
    monthEnd,
    enabled: monthlyGenTrigger > 0 && mode === 'monthly' && !!effectiveCompanyId && !!monthStart,
  });

  const isLoading = mode === 'weekly' ? isLoadingWeekly : isLoadingMonthly;
  const error = mode === 'weekly' ? weeklyError : monthlyError;
  const reportData = mode === 'weekly' ? weeklyData : monthlyData;

  const handleGenerate = useCallback(() => {
    if (!effectiveCompanyId) return;
    if (mode === 'weekly' && !weekStart) return;
    if (mode === 'monthly' && !monthStart) return;
    setDecisions(new Map());
    setComments({ general: '', alerts: '', ads: '', detail: '' });
    setMonthlyComments({ executiveNarrative: '', actionPlan: [] });
    setGenerateTrigger((n) => n + 1);
    if (mode === 'weekly') setWeeklyGenTrigger((n) => n + 1);
    else setMonthlyGenTrigger((n) => n + 1);
  }, [effectiveCompanyId, weekStart, monthStart, mode]);

  const handleDecisionChange = useCallback((key: string, value: InvestmentDecisionValue) => {
    setDecisions((prev) => {
      const next = new Map(prev);
      next.set(key, value);
      return next;
    });
  }, []);

  const canGenerate = !!effectiveCompanyId && (mode === 'weekly' ? !!weekStart : !!monthStart);

  const emailSubject = mode === 'weekly' ? weeklyData?.emailSubject : monthlyData?.emailSubject;

  const buildHtml = useCallback(() => {
    if (mode === 'weekly' && weeklyData) {
      return buildWeeklyReportHtml(weeklyData, decisions, comments);
    }
    if (mode === 'monthly' && monthlyData) {
      return buildMonthlyReportHtml(monthlyData, monthlyComments);
    }
    return '';
  }, [mode, weeklyData, monthlyData, decisions, comments, monthlyComments]);

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
        <p className="text-sm text-gray-500 mt-1">
          Genera el informe para enviar a tu cliente
        </p>
      </div>

      {/* Mode toggle */}
      <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-100">
        <button
          onClick={() => setMode('weekly')}
          className={cn(
            'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
            mode === 'weekly'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700',
          )}
        >
          Semanal
        </button>
        <button
          onClick={() => setMode('monthly')}
          className={cn(
            'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
            mode === 'monthly'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700',
          )}
        >
          Mensual
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px]">
          <Select
            label="Compañía"
            options={companyOptions}
            value={effectiveCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            placeholder="Selecciona compañía"
          />
        </div>

        <div className="min-w-[260px]">
          {mode === 'weekly' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Semana</label>
              <WeekPicker value={selectedWeek} onChange={setSelectedWeek} />
            </div>
          ) : (
            <Select
              label="Mes"
              options={monthSelectOptions}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              placeholder="Selecciona mes"
            />
          )}
        </div>

        <div className="pb-px">
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || isLoading}
            className="h-[38px] inline-flex items-center gap-2 px-4 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Wand2 className="w-4 h-4" />
            {isLoading ? 'Generando...' : 'Generar Correo'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          Error al generar el informe: {error.message}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Report content */}
      {reportData && !isLoading && (
        <>
          {/* Email Subject */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Asunto del correo</p>
                <p className="text-sm font-medium text-gray-900 truncate">{emailSubject}</p>
              </div>
              <button
                onClick={async () => {
                  if (emailSubject) await navigator.clipboard.writeText(emailSubject);
                  setSubjectCopied(true);
                  setTimeout(() => setSubjectCopied(false), 2000);
                }}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
              >
                {subjectCopied ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Weekly preview */}
          {mode === 'weekly' && weeklyData && (
            <ReportPreview
              data={weeklyData}
              decisions={decisions}
              onDecisionChange={handleDecisionChange}
              comments={comments}
              onCommentChange={(key, value) => setComments((prev) => ({ ...prev, [key]: value }))}
            />
          )}

          {/* Monthly preview */}
          {mode === 'monthly' && monthlyData && (
            <MonthlyReportPreview
              data={monthlyData}
              comments={monthlyComments}
              onNarrativeChange={(v) => setMonthlyComments((prev) => ({ ...prev, executiveNarrative: v }))}
              onActionPlanChange={(items) => setMonthlyComments((prev) => ({ ...prev, actionPlan: items }))}
            />
          )}

          {/* Copy button */}
          <div className="flex justify-center pt-2 pb-8">
            <CopyEmailButton buildHtml={buildHtml} />
          </div>
        </>
      )}

      {/* Empty state */}
      {!reportData && !isLoading && !error && generateTrigger === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Wand2 className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm">
            Selecciona una compañía y período, luego pulsa <strong>Generar</strong>
          </p>
        </div>
      )}
    </div>
  );
}
