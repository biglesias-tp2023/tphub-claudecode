/**
 * WeekPicker — dropdown to select one of the last 4 complete weeks.
 * Uses the portal's Select UI component for consistent look and feel.
 */

import { useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { Select } from '@/components/ui';
import { getLastNWeeks, type WeekRange } from '@/utils/dateUtils';

interface WeekPickerProps {
  value: WeekRange | null;
  onChange: (week: WeekRange) => void;
}

function getISOWeekNumber(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00');
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

function formatWeekOption(week: WeekRange): string {
  const start = new Date(week.start + 'T00:00:00');
  const end = new Date(week.end + 'T00:00:00');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const weekNum = getISOWeekNumber(week.start);

  const sDay = start.getDate();
  const sMonth = months[start.getMonth()];
  const eDay = end.getDate();
  const eMonth = months[end.getMonth()];

  const dateRange = start.getMonth() === end.getMonth()
    ? `${sDay}-${eDay} ${sMonth}`
    : `${sDay} ${sMonth} - ${eDay} ${eMonth}`;

  return `${dateRange} (Semana ${weekNum})`;
}

export function WeekPicker({ value, onChange }: WeekPickerProps) {
  const weeks = useMemo(() => getLastNWeeks(4), []);

  const options = useMemo(
    () => weeks.map((w) => ({ value: w.start, label: formatWeekOption(w) })),
    [weeks],
  );

  return (
    <Select
      options={options}
      value={value?.start ?? ''}
      onChange={(e) => {
        const week = weeks.find((w) => w.start === e.target.value);
        if (week) onChange(week);
      }}
      placeholder="Selecciona semana"
      leftIcon={<Calendar className="w-4 h-4" />}
    />
  );
}
