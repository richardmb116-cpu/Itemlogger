import { useColors } from '@/constants/theme';
import { todayISO } from '@/lib/dates';

/** Browser preview only: a plain HTML date input. */
export function DateField({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const c = useColors();
  return (
    <input
      type="date"
      value={value}
      max={todayISO()}
      onChange={(e) => e.target.value && onChange(e.target.value)}
      style={{
        font: 'inherit',
        fontSize: 17,
        color: c.accent,
        background: c.fill,
        border: 'none',
        borderRadius: 8,
        padding: '6px 10px',
      }}
    />
  );
}
