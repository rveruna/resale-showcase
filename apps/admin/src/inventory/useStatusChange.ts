import type { StatusAction } from '@resale/domain/item/status';
import { useState } from 'react';
import { ApiError, messageOf } from '../api/apiResponse';
import { type InventoryItem, itemsCollection } from './itemsCollection';
import { changeStatuses } from './statusChange';

export type StatusChange = {
  pending: boolean;
  /** Why the last change was undone; `null` when there's nothing to say. */
  error: string | null;
  apply: (action: StatusAction, rows: InventoryItem[]) => void;
  dismissError: () => void;
};

/**
 * Runs a status button on the ticked rows (`changeStatuses`). `onDone` gets
 * their ids once the API has saved them all.
 */
export function useStatusChange(onDone: (ids: string[]) => void): StatusChange {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return {
    pending,
    error,
    apply: (action, rows) => {
      setError(null);
      setPending(true);
      const transaction = changeStatuses({
        action,
        items: rows.map(({ id, version }) => ({ id, version })),
      });
      transaction.isPersisted.promise
        .then(() => onDone(rows.map((row) => row.id)))
        .catch((failure: unknown) => {
          setError(`Nothing changed. ${messageOf(failure)}`);
          // Someone saved one of them meanwhile: load the new versions for another go.
          if (failure instanceof ApiError && failure.code === 'VERSION_CONFLICT') {
            itemsCollection.utils.refetch().catch(() => undefined);
          }
        })
        .finally(() => setPending(false));
    },
    dismissError: () => setError(null),
  };
}
