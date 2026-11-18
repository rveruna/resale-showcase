import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CATEGORIES } from '@resale/domain/item/categories';
import { CHANNELS } from '@resale/domain/item/channels';
import { formatPrice } from '@resale/domain/money';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { InventoryItem } from './itemsCollection';

export type InventoryRowProps = {
  item: InventoryItem;
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
};

const STATUS_STYLE = {
  available: null,
  sold: { label: 'Sold', color: '#1b6e3a', background: '#e3f4e8' },
  archived: { label: 'Archived', color: '#555', background: '#eee' },
} as const;

/** One item in the list: tick it for a bulk button, or press it to open the item. */
export function InventoryRow({ item, selected, onToggle, onOpen }: InventoryRowProps) {
  const details = [
    item.brand,
    item.category === null ? null : CATEGORIES[item.category],
    item.size,
  ].filter((detail) => detail !== null);
  const badge = STATUS_STYLE[item.status];
  return (
    <View style={[styles.row, selected && styles.selected]} testID={`row-${item.id}`}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        accessibilityLabel={`Tick ${item.title}`}
        hitSlop={8}
        onPress={onToggle}
      >
        <MaterialCommunityIcons
          name={selected ? 'checkbox-marked' : 'checkbox-blank-outline'}
          size={22}
          color={selected ? '#222' : '#999'}
        />
      </Pressable>
      <Pressable accessibilityRole="button" style={styles.main} onPress={onOpen}>
        <View style={styles.top}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.price, item.pricePence === null && styles.missing]}>
            {item.pricePence === null ? 'No price' : formatPrice(item.pricePence)}
          </Text>
        </View>
        {details.length > 0 && <Text style={styles.details}>{details.join(' · ')}</Text>}
        <View style={styles.tags}>
          {badge !== null && (
            <Text style={[styles.tag, { color: badge.color, backgroundColor: badge.background }]}>
              {badge.label}
            </Text>
          )}
          {item.channels.map((channel) => (
            <Text key={channel} style={[styles.tag, styles.channel]}>
              {CHANNELS[channel]}
            </Text>
          ))}
          {item.labels.map((label) => (
            <Text key={label} style={[styles.tag, styles.label]}>
              {label}
            </Text>
          ))}
          {item.status === 'available' && item.toCheck.length > 0 && (
            <Text style={[styles.tag, styles.toCheck]}>Needs {item.toCheck.join(', ')}</Text>
          )}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
    backgroundColor: '#fff',
  },
  selected: { backgroundColor: '#f4f6fb' },
  main: { flex: 1, gap: 4 },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  title: { flex: 1, fontSize: 16, fontWeight: '500', color: '#111' },
  price: { fontSize: 16, fontVariant: ['tabular-nums'], color: '#111' },
  missing: { color: '#b00020' },
  details: { fontSize: 13, color: '#666' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  tag: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  channel: { color: '#1f4fa3', backgroundColor: '#e7eefb' },
  label: { color: '#6b4b00', backgroundColor: '#fbf1d9' },
  toCheck: { color: '#b00020', backgroundColor: '#fde8eb' },
});
