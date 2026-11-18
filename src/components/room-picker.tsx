import { ScrollView, StyleSheet } from 'react-native';

import { Chip } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { ROOMS } from '@/lib/rooms';

/** A row of room chips; tap the chosen one again to clear it. */
export function RoomPicker({ value, onChange }: { value: string | null; onChange: (room: string | null) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} keyboardShouldPersistTaps="handled">
      {ROOMS.map((r) => (
        <Chip key={r.id} label={r.label} selected={value === r.id} onPress={() => onChange(value === r.id ? null : r.id)} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.sm, padding: Spacing.md },
});
