import { cn } from '@/utils/cn';
import { getSeverity, type CompanyAlert } from '@/features/my-clients/utils/alertUtils';

interface SlackPreviewProps {
  firstName: string;
  alertCompanies: CompanyAlert[];
  dateLabel: string;
}

export function SlackPreview({ firstName, alertCompanies, dateLabel }: SlackPreviewProps) {
  if (alertCompanies.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg p-5 text-center">
        <p className="text-gray-400 text-sm">Sin alertas para previsualizar</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4 max-h-[400px] overflow-y-auto">
      {/* Bot header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-md bg-primary-600 flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold">TP</span>
        </div>
        <div>
          <span className="text-white text-sm font-bold">TPHub Bot</span>
          <span className="ml-2 text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">APP</span>
        </div>
        <span className="text-xs text-gray-500 ml-auto">Hoy a las 08:30</span>
      </div>

      {/* Message */}
      <div className="space-y-3 text-sm">
        <p className="text-gray-300">
          Buenos dias, <span className="text-sky-400 font-medium">@{firstName.toLowerCase()}</span>
        </p>
        <p className="text-gray-400 text-xs">
          Resumen de alertas del {dateLabel} · {alertCompanies.length} clientes bajo umbral
        </p>

        {alertCompanies.map((company, idx) => {
          const severity = getSeverity(company.score);
          const slackDot = company.score >= 60 ? '\u{1F534}' : company.score >= 30 ? '\u{1F7E0}' : '\u{1F7E1}';

          return (
            <div
              key={company.name}
              className={cn(
                'border-l-[3px] rounded-r-md bg-gray-800/60 px-3 py-2',
                company.score >= 60 ? 'border-l-red-500' : company.score >= 30 ? 'border-l-orange-500' : 'border-l-amber-500'
              )}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">{slackDot}</span>
                <span className="text-white font-semibold text-sm">#{idx + 1} {company.name}</span>
                <span className={cn('text-[10px] font-bold ml-auto', severity.color)}>{severity.label}</span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                {company.deviations.map((d) => (
                  <span key={d.label} className="text-xs text-gray-400">
                    {d.label}: <span className="text-gray-300">{d.value}</span>
                    <span className="text-gray-600"> (umbral {d.threshold})</span>
                  </span>
                ))}
              </div>
            </div>
          );
        })}

        {/* Footer */}
        <p className="text-sky-400 text-xs hover:underline cursor-pointer mt-2">
          Ver detalles en TPHub &rarr;
        </p>
      </div>
    </div>
  );
}
