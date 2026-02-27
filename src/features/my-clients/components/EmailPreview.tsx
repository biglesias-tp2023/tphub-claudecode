import { useMemo } from 'react';
import { getSeverity, type CompanyAlert } from '@/features/my-clients/utils/alertUtils';

interface EmailPreviewProps {
  consultantName: string;
  alertCompanies: CompanyAlert[];
  dateLabel: string;
}

export function EmailPreview({ consultantName, alertCompanies, dateLabel }: EmailPreviewProps) {
  const html = useMemo(() => {
    const companyCards = alertCompanies.map((company, idx) => {
      const severity = getSeverity(company.score);
      const borderColor = company.score >= 60 ? '#ef4444' : company.score >= 30 ? '#f97316' : '#f59e0b';
      const bgColor = company.score >= 60 ? '#fef2f2' : company.score >= 30 ? '#fff7ed' : '#fffbeb';
      const labelColor = company.score >= 60 ? '#b91c1c' : company.score >= 30 ? '#c2410c' : '#b45309';

      const kpis = company.deviations
        .map((d) => `<li style="margin:2px 0;font-size:13px;color:#374151">${d.label}: <strong>${d.value}</strong> <span style="color:#9ca3af">(umbral ${d.threshold})</span></li>`)
        .join('');

      return `<div style="border-left:4px solid ${borderColor};background:${bgColor};border-radius:8px;padding:12px 16px;margin-bottom:12px">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="font-size:14px;font-weight:700;color:#111827">#${idx + 1} ${company.name}</td>
            <td align="right"><span style="font-size:10px;font-weight:700;color:${labelColor};background:white;padding:2px 8px;border-radius:10px">${severity.label}</span></td>
          </tr>
        </table>
        <ul style="margin:6px 0 0;padding:0 0 0 16px">${kpis}</ul>
      </div>`;
    }).join('');

    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#f3f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
      <div style="max-width:560px;margin:0 auto;padding:24px">
        <div style="background:#095789;border-radius:12px 12px 0 0;padding:24px;text-align:center">
          <div style="width:48px;height:48px;border-radius:50%;background:white;margin:0 auto 12px;line-height:48px;text-align:center">
            <span style="color:#095789;font-weight:700;font-size:18px">TP</span>
          </div>
          <h1 style="color:white;font-size:18px;margin:0;font-weight:600">Alertas diarias</h1>
          <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:4px 0 0">${dateLabel}</p>
        </div>
        <div style="background:white;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none">
          <p style="color:#6b7280;font-size:14px;margin:0 0 20px">Hola ${consultantName.split(' ')[0]}, estas son las anomalias detectadas:</p>
          ${companyCards || '<p style="color:#9ca3af;font-size:14px;text-align:center;padding:20px 0">Sin alertas</p>'}
          <div style="text-align:center;margin:24px 0 16px">
            <a href="#" style="display:inline-block;background:#095789;color:white;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600">Ver detalles en TPHub</a>
          </div>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
          <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center">ThinkPaladar &mdash; Consultoria de Delivery</p>
          <p style="color:#9ca3af;font-size:11px;margin:6px 0 0;text-align:center">
            <a href="#" style="color:#095789;text-decoration:none">Configurar alertas</a>
          </p>
        </div>
      </div>
    </body></html>`;
  }, [consultantName, alertCompanies, dateLabel]);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
      <iframe
        title="Vista previa email"
        srcDoc={html}
        className="w-full border-0"
        style={{ height: '400px', pointerEvents: 'none' }}
        sandbox=""
      />
    </div>
  );
}
