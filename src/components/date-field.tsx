import DateTimePicker from '@react-native-community/datetimepicker';

import { useColors } from '@/constants/theme';
import { parseISODate, toISODate } from '@/lib/dates';

/** Native iOS compact date picker. See date-field.web.tsx for the browser preview. */
export function DateField({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const c = useColors();
  return (
    <DateTimePicker
      value={parseISODate(value)}
      mode="date"
      display="compact"
      maximumDate={new Date()}
      accentColor={c.accent}
      onValueChange={(_event, date) => {
        if (date) onChange(toISODate(date));
      }}
    />
  );
}
