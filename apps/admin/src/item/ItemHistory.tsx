import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { HistoryEntry } from './historyEntries';

export type ItemHistoryProps = {
  /** `null` while loading. */
  entries: HistoryEntry[] | null;
  error: string | null;
};

const when = (at: string) =>
  new Date(at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

/** What changed, newest first: one block per save or status button. */
export function ItemHistory({ entries, error }: ItemHistoryProps) {
  return (
    <View style={styles.history} testID="item-history">
      <Text style={styles.heading}>History</Text>
      {error !== null ? (
        <Text style={styles.error}>History couldn’t load: {error}</Text>
      ) : entries === null ? (
        <ActivityIndicator style={styles.loading} />
      ) : entries.length === 0 ? (
        <Text style={styles.empty}>No changes yet.</Text>
      ) : (
        entries.map((entry) => (
          <View key={entry.id} style={styles.entry}>
            <Text style={styles.when}>
              {when(entry.at)} · {entry.by}
            </Text>
            {entry.lines.map((line) => (
              <Text key={line.field} style={styles.line}>
                <Text style={styles.field}>{line.field}: </Text>
                {line.from} → {line.to}
              </Text>
            ))}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  history: { gap: 10 },
  heading: { fontSize: 17, fontWeight: '600' },
  loading: { alignSelf: 'flex-start' },
  entry: { gap: 2 },
  when: { fontSize: 13, color: '#666' },
  line: { fontSize: 14, color: '#222' },
  field: { fontWeight: '600' },
  empty: { fontSize: 14, color: '#666' },
  error: { fontSize: 14, color: '#b00020' },
});
