import { DEFAULT_QUERY, type InventoryQuery } from '@resale/domain/inventory/inventoryList';
import { STATUS_ACTIONS } from '@resale/domain/item/status';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { itemChoicesQuery } from '../item/itemQueries';
import { openItem, openNewItem } from '../item/openItem';
import { InventoryView } from './InventoryView';
import { itemsCollection } from './itemsCollection';
import { appliesToAll } from './statusChange';
import { useInventory } from './useInventory';
import { useStatusChange } from './useStatusChange';

/**
 * Home: the inventory, newest first. Ticks stay across pages, views and sorts
 * until cleared or a bulk button has saved them.
 */
export function InventoryScreen() {
  const [query, setQuery] = useState<InventoryQuery>(DEFAULT_QUERY);
  // A failed load only leaves the label filter empty: the list itself still shows.
  const choices = useQuery(itemChoicesQuery);
  const inventory = useInventory(query);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const toggled = (ids: string[], on: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  const statusChange = useStatusChange((done) => toggled(done, false));
  const ticked = [...selected].flatMap((id) => {
    const row = itemsCollection.get(id);
    return row === undefined ? [] : [row];
  });
  return (
    <InventoryView
      query={query}
      onChangeQuery={setQuery}
      items={inventory.items}
      total={inventory.total}
      counts={inventory.counts}
      loading={inventory.loading}
      error={inventory.error}
      onRetry={inventory.reload}
      page={inventory.page}
      pageCount={inventory.pageCount}
      pageSize={inventory.pageSize}
      onPage={inventory.setPage}
      onPageSize={inventory.setPageSize}
      labels={choices.data?.labels ?? []}
      selected={selected}
      onToggle={(id) => toggled([id], !selected.has(id))}
      onTogglePage={(ids) => toggled(ids, !ids.every((id) => selected.has(id)))}
      onClearSelection={() => setSelected(new Set())}
      bulk={{
        actions: STATUS_ACTIONS.map((action) => ({
          action,
          enabled: appliesToAll(action, ticked),
        })),
        pending: statusChange.pending,
        error: statusChange.error,
        onApply: (action) => statusChange.apply(action, ticked),
        onDismissError: statusChange.dismissError,
      }}
      onOpenItem={openItem}
      onNewItem={openNewItem}
    />
  );
}
