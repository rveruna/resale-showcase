import { createItem, type ItemEdit } from '@resale/domain/item/item';
import type { StatusAction } from '@resale/domain/item/status';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../api/apiClient';
import { ApiError, messageOf, unwrap } from '../api/apiResponse';
import { itemsCollection } from '../inventory/itemsCollection';
import { historyEntries, type HistoryEntry } from './historyEntries';
import { checkForm, type FormIssues, formOf, type ItemForm, itemOf } from './itemForm';
import {
  itemChangesQuery,
  type ItemChoices,
  itemChoicesQuery,
  type ItemDetail,
  itemQuery,
} from './itemQueries';
import { NEW_ITEM } from './newItem';

/** Unsaved changes, for the version they started from; a new item's start at 0. */
type Draft = { version: number; form: ItemForm };
const UNSAVED = 0;

/** Where to go once the item is created, copied or gone. */
export type ItemNavigation = {
  /** A new item's first Save made it: it has an id now. */
  onCreated: (id: string) => void;
  onDuplicated: (id: string) => void;
  onDeleted: () => void;
};

export type ItemEditor = {
  /** `/items/new` before its first Save: nothing to load, change or copy yet. */
  isNew: boolean;
  /** `null` while loading, and for a new item. */
  detail: ItemDetail | null;
  choices: ItemChoices | null;
  /** `null` until it can be edited. */
  form: ItemForm | null;
  issues: FormIssues;
  /** The form differs from the saved item. */
  changed: boolean;
  loading: boolean;
  /** Loading the item or the suggestions failed. */
  error: string | null;
  saving: boolean;
  saveError: string | null;
  /** The save was refused because the item changed meanwhile: reload it. */
  conflict: boolean;
  change: (form: ItemForm) => void;
  /** Saves the form; `then` runs once it's saved. */
  save: (then?: () => void) => void;
  /** Loads the item again, dropping unsaved changes. */
  reload: () => void;
  /** Drops unsaved changes without loading again. */
  discard: () => void;
  /** `null` while loading. */
  history: HistoryEntry[] | null;
  historyError: string | null;
  /** Why status, Duplicate and Delete wait; `null` when they can be pressed. */
  waitReason: string | null;
  /** A status change, a copy or a delete is on its way. */
  acting: boolean;
  actionError: string | null;
  changeStatus: (action: StatusAction) => void;
  duplicate: () => void;
  remove: () => void;
};

/**
 * One item and its edit form (docs/architecture.md, Server data). The item is a
 * query; a save is a mutation that, on success, puts the server's answer in that
 * query and its row in the list's collection, so the list is right without
 * loading again. Unsaved edits live in the form, so there's nothing to roll back.
 */
export function useItem(id: string, navigation: ItemNavigation): ItemEditor {
  const queryClient = useQueryClient();
  // A new item has its id from the first Save on, before the route hears of it.
  const [createdId, setCreatedId] = useState<string | null>(null);
  const itemId = id === NEW_ITEM ? createdId : id;
  const isNew = itemId === null;
  const detail = useQuery({ ...itemQuery(itemId ?? NEW_ITEM), enabled: !isNew });
  const choices = useQuery(itemChoicesQuery);
  const changes = useQuery({ ...itemChangesQuery(itemId ?? NEW_ITEM), enabled: !isNew });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [blank] = useState(() => createItem({ id: NEW_ITEM, createdAt: new Date() }));
  // A new item's form shows what's missing only once Save was pressed.
  const [tried, setTried] = useState(false);

  /** A write came back: show it here, in the list and in the history. */
  const saved = async (next: ItemDetail) => {
    const { id: savedId } = next.item;
    queryClient.setQueryData(itemQuery(savedId).queryKey, next);
    if (itemsCollection.has(savedId)) await itemsCollection.utils.writeUpdate(next.summary);
    // A new item, unless the list hasn't loaded (it loads it with everything else).
    else if (itemsCollection.isReady()) await itemsCollection.utils.writeInsert(next.summary);
    await Promise.all([
      queryClient.invalidateQueries(itemChangesQuery(savedId)),
      // A new brand or label joins the suggestions.
      queryClient.invalidateQueries(itemChoicesQuery),
    ]);
  };

  const saving = useMutation({
    mutationFn: ({ from, set }: { from: { id: string; version: number } | null; set: ItemEdit }) =>
      from === null
        ? unwrap(api.items.$post({ json: { set } }))
        : unwrap(
            api.items[':id'].$patch({
              param: { id: from.id },
              json: { version: from.version, set },
            }),
          ),
    onSuccess: async (next, { from }) => {
      await saved(next);
      setDraft(null);
      if (from === null) {
        setCreatedId(next.item.id);
        navigation.onCreated(next.item.id);
      }
    },
  });

  const statusChange = useMutation({
    mutationFn: ({ version, action }: { version: number; action: StatusAction }) =>
      unwrap(api.items[':id'].status.$post({ param: { id }, json: { version, action } })),
    onSuccess: saved,
  });

  const copying = useMutation({
    mutationFn: () => unwrap(api.items[':id'].duplicate.$post({ param: { id } })),
    onSuccess: async (copy) => {
      queryClient.setQueryData(itemQuery(copy.item.id).queryKey, copy);
      if (itemsCollection.isReady()) await itemsCollection.utils.writeInsert(copy.summary);
      navigation.onDuplicated(copy.item.id);
    },
  });

  const deleting = useMutation({
    mutationFn: () => unwrap(api.items[':id'].$delete({ param: { id } })),
    onSuccess: async () => {
      if (itemsCollection.has(id)) await itemsCollection.utils.writeDelete(id);
      navigation.onDeleted();
      queryClient.removeQueries({ queryKey: itemQuery(id).queryKey });
    },
  });
  const actions = [statusChange, copying, deleting];
  const resetActions = () => {
    for (const action of actions) action.reset();
  };

  const item = isNew ? blank : detail.data === undefined ? null : itemOf(detail.data);
  const version = isNew ? UNSAVED : detail.data?.version;
  const savedForm = item === null ? null : formOf(item);
  // A newer version (after a save or a reload) starts the form afresh.
  const form = draft !== null && draft.version === version ? draft.form : savedForm;
  const changed = form !== null && JSON.stringify(form) !== JSON.stringify(savedForm);
  const check = item === null || form === null ? null : checkForm(form, item);
  const failure = detail.error ?? choices.error;
  const actionFailure = actions.find((action) => action.error !== null)?.error ?? null;

  return {
    isNew,
    detail: isNew ? null : (detail.data ?? null),
    choices: choices.data ?? null,
    form,
    issues: check?.ok === false && (!isNew || tried) ? check.issues : {},
    changed,
    loading: !isNew && detail.isLoading,
    error: failure === null ? null : messageOf(failure),
    saving: saving.isPending,
    saveError: saving.error === null ? null : messageOf(saving.error),
    conflict: saving.error instanceof ApiError && saving.error.code === 'VERSION_CONFLICT',
    change: (next) => {
      if (version !== undefined) setDraft({ version, form: next });
      saving.reset();
      resetActions();
    },
    save: (then) => {
      if (saving.isPending || version === undefined) return;
      setTried(true);
      if (check?.ok !== true) return;
      const from = isNew || itemId === null ? null : { id: itemId, version };
      saving.mutate({ from, set: check.set }, { onSuccess: () => then?.() });
    },
    reload: () => {
      setDraft(null);
      saving.reset();
      resetActions();
      if (!isNew) {
        Promise.all([detail.refetch(), changes.refetch(), choices.refetch()]).catch(
          () => undefined,
        );
      }
    },
    discard: () => {
      setDraft(null);
      saving.reset();
    },
    history: isNew ? [] : changes.data === undefined ? null : historyEntries(changes.data.changes),
    historyError: changes.error === null ? null : messageOf(changes.error),
    // A status change makes a new version, which would drop the form's changes.
    waitReason: changed ? 'Save or discard your changes first' : null,
    acting: saving.isPending || actions.some((action) => action.isPending),
    actionError: actionFailure === null ? null : messageOf(actionFailure),
    changeStatus: (action) => {
      if (detail.data === undefined) return;
      resetActions();
      statusChange.mutate({ version: detail.data.version, action });
    },
    duplicate: () => {
      resetActions();
      copying.mutate();
    },
    remove: () => {
      resetActions();
      deleting.mutate();
    },
  };
}
