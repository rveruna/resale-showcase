import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type FieldProps = {
  /** Left out where the input says what it is on its own. */
  label?: string;
  /** What's wrong with it, shown under the input. */
  error?: string | undefined;
  hint?: string | undefined;
  /** On the label's row, on the right, e.g. "59/80". */
  counter?: { text: string; over: boolean };
  children: ReactNode;
};

/** A form field: its label, the input, and a hint or what's wrong. */
export function Field({ label, error, hint, counter, children }: FieldProps) {
  return (
    <View style={styles.field}>
      {(label !== undefined || counter !== undefined) && (
        <View style={styles.top}>
          <Text style={styles.label}>{label}</Text>
          {counter !== undefined && (
            <Text style={[styles.hint, counter.over && styles.error]}>{counter.text}</Text>
          )}
        </View>
      )}
      {children}
      {error !== undefined ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        hint !== undefined && <Text style={styles.hint}>{hint}</Text>
      )}
    </View>
  );
}

/** A text input's look, shared by every form. */
export const inputStyle = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#fff',
  },
}).input;

/** The red border on an input that's missing or wrong. */
export const missingStyle = StyleSheet.create({ missing: { borderColor: '#b00020' } }).missing;

const styles = StyleSheet.create({
  field: { gap: 6 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: { fontSize: 13, fontWeight: '600', color: '#444' },
  error: { fontSize: 13, color: '#b00020' },
  hint: { fontSize: 13, color: '#666' },
});
