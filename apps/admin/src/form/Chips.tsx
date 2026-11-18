import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { missingStyle } from './Field';

export type ChipsProps<T extends string> = {
  /** `icon` is drawn before the label. */
  options: readonly { value: T; label: string; icon?: ReactNode }[];
  selected: readonly T[];
  onPress: (value: T) => void;
  /** Red borders: nothing picked where something must be. */
  missing?: boolean;
  testID?: string;
};

/** Tappable choices in a wrapping row; one or several selected, as the caller decides. */
export function Chips<T extends string>({
  options,
  selected,
  onPress,
  missing = false,
  testID,
}: ChipsProps<T>) {
  return (
    <View style={styles.chips} testID={testID}>
      {options.map((option) => {
        const isSelected = selected.includes(option.value);
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            style={[styles.chip, missing && missingStyle, isSelected && styles.chipSelected]}
            onPress={() => onPress(option.value)}
          >
            {option.icon}
            <Text style={isSelected ? styles.selectedText : styles.text}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  chipSelected: { backgroundColor: '#222', borderColor: '#222' },
  text: { fontSize: 14, color: '#222' },
  selectedText: { fontSize: 14, color: '#fff' },
});
