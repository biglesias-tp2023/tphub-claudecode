import type { AlertPreferenceInput } from '@/services/alertPreferences';
import type { AlertFrequency } from '@/features/my-clients/hooks/useAlertConfig';

// ─── Types ───

export interface CompanyAlert {
  name: string;
  score: number;
  deviations: { label: string; value: string; threshold: string; deviation: string }[];
}

export interface Thresholds {
  orders: number;
  reviews: number;
  adsRoas: number;
  promos: number;
}

// ─── Deterministic hash ───

export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 10000;
  return x - Math.floor(x);
}

// ─── Urgency scoring ───

export function computeUrgencyScore(
  thresholds: Thresholds,
  pref: AlertPreferenceInput,
  companyName: string,
): { score: number; deviations: CompanyAlert['deviations'] } {
  let totalScore = 0;
  const deviations: CompanyAlert['deviations'] = [];

  if (pref.ordersEnabled) {
    const th = pref.ordersThreshold ?? thresholds.orders;
    const r = seededRandom(hashString(companyName + 'orders'));
    const actual = -(Math.abs(th) + Math.floor(r * 20));
    if (actual < th) {
      const dev = Math.abs(actual - th);
      totalScore += Math.min(dev * 1.5, 30);
      deviations.push({
        label: 'Pedidos',
        value: `${actual}%`,
        threshold: `${th}%`,
        deviation: `${actual - th}%`,
      });
    }
  }

  if (pref.reviewsEnabled) {
    const th = pref.reviewsThreshold ?? thresholds.reviews;
    const r = seededRandom(hashString(companyName + 'reviews'));
    const actual = th - (0.3 + r * 0.8);
    if (actual < th) {
      const dev = Math.abs(actual - th);
      totalScore += Math.min(dev * 8, 25);
      deviations.push({
        label: 'Resenas',
        value: actual.toFixed(1),
        threshold: th.toFixed(1),
        deviation: `-${(th - actual).toFixed(1)}`,
      });
    }
  }

  if (pref.adsEnabled) {
    const th = pref.adsRoasThreshold ?? thresholds.adsRoas;
    const r = seededRandom(hashString(companyName + 'adsRoas'));
    const actual = th - (0.5 + r * 1.5);
    if (actual < th) {
      const dev = Math.abs(actual - th);
      totalScore += Math.min(dev * 10, 25);
      deviations.push({
        label: 'Ads ROAS',
        value: `${actual.toFixed(1)}x`,
        threshold: `${th.toFixed(1)}x`,
        deviation: `-${(th - actual).toFixed(1)}x`,
      });
    }
  }

  if (pref.promosEnabled) {
    const th = pref.promosThreshold ?? thresholds.promos;
    const r = seededRandom(hashString(companyName + 'promos'));
    const actual = th + (2 + Math.floor(r * 10));
    if (actual > th) {
      const dev = Math.abs(actual - th);
      totalScore += Math.min(dev * 2, 20);
      deviations.push({
        label: 'Promos',
        value: `${actual}%`,
        threshold: `${th}%`,
        deviation: `+${actual - th}%`,
      });
    }
  }

  return { score: Math.round(totalScore), deviations };
}

// ─── Severity ───

export function getSeverity(score: number) {
  if (score >= 60) return { label: 'CRITICO', color: 'text-red-700', borderColor: 'border-l-red-500', dotColor: 'bg-red-500', bgColor: 'bg-red-50' };
  if (score >= 30) return { label: 'URGENTE', color: 'text-orange-700', borderColor: 'border-l-orange-500', dotColor: 'bg-orange-500', bgColor: 'bg-orange-50' };
  return { label: 'ATENCION', color: 'text-amber-700', borderColor: 'border-l-amber-500', dotColor: 'bg-amber-500', bgColor: 'bg-amber-50' };
}

// ─── Date helpers ───

export function getDateLabel(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${days[yesterday.getDay()]} ${yesterday.getDate()} ${months[yesterday.getMonth()]}`;
}

export function getNextSendLabel(frequency: AlertFrequency): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const days = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  let nextDate: Date;

  if (frequency === 'daily') {
    nextDate = new Date(now);
    nextDate.setDate(nextDate.getDate() + 1);
  } else if (frequency === 'weekdays') {
    nextDate = new Date(now);
    if (dayOfWeek === 5) nextDate.setDate(nextDate.getDate() + 3);
    else if (dayOfWeek === 6) nextDate.setDate(nextDate.getDate() + 2);
    else nextDate.setDate(nextDate.getDate() + 1);
  } else {
    nextDate = new Date(now);
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
    nextDate.setDate(nextDate.getDate() + daysUntilMonday);
  }

  return `${days[nextDate.getDay()]} ${nextDate.getDate()} ${months[nextDate.getMonth()]} · 08:30 CET`;
}

export function getFirstName(fullName: string | null): string {
  if (!fullName) return 'Consultor';
  return fullName.split(' ')[0];
}

export function getRelativeTime(isoDate: string | null): string | null {
  if (!isoDate) return null;
  const diff = Date.now() - new Date(isoDate).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 10) return 'ahora';
  if (seconds < 60) return `hace ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `hace ${hours}h`;
}

// ─── Constants ───

export const FREQUENCY_OPTIONS: { value: AlertFrequency; label: string }[] = [
  { value: 'weekdays', label: 'Diaria (L-V)' },
  { value: 'daily', label: 'Diaria (7 dias)' },
  { value: 'weekly', label: 'Semanal (lunes)' },
];
