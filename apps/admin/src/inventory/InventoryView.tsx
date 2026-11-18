import { CHANNEL_KEYS, CHANNELS } from '@resale/domain/item/channels';
import {
  INVENTORY_SORTS,
  INVENTORY_VIEWS,
  type InventoryQuery,
  type InventorySort,
  type InventoryView as InventoryViewName,
  SORT_DIRECTION,
} from '@resale/domain/inventory/inventoryList';
import type { StatusAction } from '@resale/domain/item/status';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Chips } from '../form/Chips';
import { inputStyle } from '../form/Field';
import { STATUS_ACTION_LABELS } from '../item/statusLabels';
import { InventoryRow } from './InventoryRow';
import type { InventoryItem } from './itemsCollection';
import { PAGE_SIZES, type PageSize } from './useInventory';

const VIEW_LABELS: Record<InventoryViewName, string> = {
  available: 'Available',
  toCheck: 'To check',
  sold: 'Sold',
  archived: 'Archived',
  all: 'All',
};

const SORT_LABELS: Record<InventorySort, string> = {
  created: 'Added',
  title: 'Title',
  price: 'Price',
  sold: 'Sold',
};

export type BulkActions = {
  /** Each button, enabled only if it does something for every ticked item. */
  actions: { action: StatusAction; enabled: boolean }[];
  pending: boolean;
  error: string | null;
  onApply: (action: StatusAction) => void;
  onDismissError: () => void;
};

export type InventoryViewProps = {
  query: InventoryQuery;
  onChangeQuery: (query: InventoryQuery) => void;
  /** This page's rows. */
  items: InventoryItem[];
  /** `null` until loaded. */
  total: number | null;
  counts: Record<InventoryViewName, number> | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  page: number;
  pageCount: number;
  pageSize: PageSize;
  onPage: (page: number) => void;
  onPageSize: (size: PageSize) => void;
  /** Every label in use, for the filter. */
  labels: string[];
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
  /** Ticks this page, or unticks it if it's all ticked. */
  onTogglePage: (ids: string[]) => void;
  onClearSelection: () => void;
  bulk: BulkActions;
  onOpenItem: (id: string) => void;
  onNewItem: () => void;
};

/** Home: the inventory, a page at a time, with views, search, sorts, filters and bulk buttons. */
export function InventoryView({
  query,
  onChangeQuery,
  items,
  total,
  counts,
  loading,
  error,
  onRetry,
  page,
  pageCount,
  pageSize,
  onPage,
  onPageSize,
  labels,
  selected,
  onToggle,
  onTogglePage,
  onClearSelection,
  bulk,
  onOpenItem,
  onNewItem,
}: InventoryViewProps) {
  const change = (next: Partial<InventoryQuery>) => onChangeQuery({ ...query, ...next });
  const direction = query.direction ?? SORT_DIRECTION[query.sort];
  const pageIds = items.map((item) => item.id);
  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.heading} accessibilityRole="header">
          Inventory
        </Text>
        <Pressable accessibilityRole="button" style={styles.primary} onPress={onNewItem}>
          <Text style={styles.primaryText}>New item</Text>
        </Pressable>
      </View>

      <TextInput
        style={inputStyle}
        placeholder="Search titles and brands"
        value={query.search}
        onChangeText={(search) => change({ search })}
        autoCorrect={false}
        clearButtonMode="while-editing"
      />

      <Chips
        testID="views"
        options={INVENTORY_VIEWS.map((view) => ({
          value: view,
          label: counts === null ? VIEW_LABELS[view] : `${VIEW_LABELS[view]} ${counts[view]}`,
        }))}
        selected={[query.view]}
        onPress={(view) => change({ view })}
      />

      <View style={styles.filters}>
        <Text style={styles.filterLabel}>Sort</Text>
        <Chips
          testID="sorts"
          options={INVENTORY_SORTS.map((sort) => ({
            value: sort,
            label:
              sort === query.sort
                ? `${SORT_LABELS[sort]} ${direction === 'asc' ? '↑' : '↓'}`
                : SORT_LABELS[sort],
          }))}
          selected={[query.sort]}
          // The same sort again reverses it; a new one starts in its own direction.
          onPress={(sort) => {
            const { direction: _, ...rest } = query;
            onChangeQuery(
              sort === query.sort
                ? { ...rest, direction: direction === 'asc' ? 'desc' : 'asc' }
                : { ...rest, sort },
            );
          }}
        />
      </View>

      <View style={styles.filters}>
        <Text style={styles.filterLabel}>On</Text>
        <Chips
          testID="channels"
          options={CHANNEL_KEYS.map((channel) => ({ value: channel, label: CHANNELS[channel] }))}
          selected={query.channel === null ? [] : [query.channel]}
          onPress={(channel) => change({ channel: channel === query.channel ? null : channel })}
        />
      </View>

      {labels.length > 0 && (
        <View style={styles.filters}>
          <Text style={styles.filterLabel}>Label</Text>
          <Chips
            testID="labels"
            options={labels.map((label) => ({ value: label, label }))}
            selected={query.label === null ? [] : [query.label]}
            onPress={(label) => change({ label: label === query.label ? null : label })}
          />
        </View>
      )}

      {selected.size > 0 && (
        <View style={styles.bulk} testID="bulk-bar">
          <Text style={styles.bulkCount}>{selected.size} ticked</Text>
          {bulk.actions.map(({ action, enabled }) => (
            <Pressable
              key={action}
              accessibilityRole="button"
              accessibilityState={{ disabled: !enabled || bulk.pending }}
              disabled={!enabled || bulk.pending}
              style={[styles.bulkButton, (!enabled || bulk.pending) && styles.disabled]}
              onPress={() => bulk.onApply(action)}
            >
              <Text style={styles.bulkButtonText}>{STATUS_ACTION_LABELS[action]}</Text>
            </Pressable>
          ))}
          {bulk.pending && <ActivityIndicator />}
          <Pressable accessibilityRole="button" onPress={onClearSelection}>
            <Text style={styles.link}>Clear</Text>
          </Pressable>
        </View>
      )}
      {bulk.error !== null && (
        <View style={styles.errorBox} accessibilityRole="alert">
          <Text style={styles.errorText}>{bulk.error}</Text>
          <Pressable accessibilityRole="button" onPress={bulk.onDismissError}>
            <Text style={styles.link}>OK</Text>
          </Pressable>
        </View>
      )}

      {error !== null ? (
        <View style={styles.errorBox} accessibilityRole="alert">
          <Text style={styles.errorText}>The inventory couldn’t load: {error}</Text>
          <Pressable accessibilityRole="button" onPress={onRetry}>
            <Text style={styles.link}>Try again</Text>
          </Pressable>
        </View>
      ) : loading ? (
        <ActivityIndicator style={styles.loading} testID="inventory-loading" />
      ) : items.length === 0 ? (
        <Text style={styles.empty}>Nothing here.</Text>
      ) : (
        <View style={styles.list}>
          <View style={styles.listHeader}>
            <Pressable accessibilityRole="button" onPress={() => onTogglePage(pageIds)}>
              <Text style={styles.link}>
                {pageIds.every((id) => selected.has(id)) ? 'Untick page' : 'Tick page'}
              </Text>
            </Pressable>
            <Text style={styles.total}>{total === 1 ? '1 item' : `${total} items`}</Text>
          </View>
          {items.map((item) => (
            <InventoryRow
              key={item.id}
              item={item}
              selected={selected.has(item.id)}
              onToggle={() => onToggle(item.id)}
              onOpen={() => onOpenItem(item.id)}
            />
          ))}
        </View>
      )}

      {error === null && !loading && pageCount > 1 && (
        <View style={styles.pager}>
          <Pressable
            accessibilityRole="button"
            disabled={page === 1}
            onPress={() => onPage(page - 1)}
          >
            <Text style={[styles.link, page === 1 && styles.disabled]}>Previous</Text>
          </Pressable>
          <Text style={styles.total}>
            Page {page} of {pageCount}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={page === pageCount}
            onPress={() => onPage(page + 1)}
          >
            <Text style={[styles.link, page === pageCount && styles.disabled]}>Next</Text>
          </Pressable>
        </View>
      )}
      {error === null && !loading && (
        <View style={styles.filters}>
          <Text style={styles.filterLabel}>Per page</Text>
          <Chips
            options={PAGE_SIZES.map((size) => ({ value: String(size), label: String(size) }))}
            selected={[String(pageSize)]}
            onPress={(size) => {
              const picked = PAGE_SIZES.find((option) => String(option) === size);
              if (picked !== undefined) onPageSize(picked);
            }}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 14, maxWidth: 900, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heading: { fontSize: 26, fontWeight: '700' },
  primary: { backgroundColor: '#222', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  filters: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  filterLabel: { fontSize: 13, fontWeight: '600', color: '#666', width: 56 },
  bulk: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#f4f6fb',
  },
  bulkCount: { fontSize: 14, fontWeight: '600' },
  bulkButton: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#222',
  },
  bulkButtonText: { color: '#fff', fontSize: 14 },
  disabled: { opacity: 0.4 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fde8eb',
  },
  errorText: { flex: 1, color: '#b00020', fontSize: 14 },
  link: { color: '#2255aa', fontSize: 15 },
  loading: { marginTop: 40 },
  empty: { fontSize: 15, color: '#666', marginTop: 24, textAlign: 'center' },
  list: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fafafa',
  },
  total: { fontSize: 14, color: '#666' },
  pager: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
