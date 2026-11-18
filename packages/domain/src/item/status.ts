import { fail, ok, type Result } from '../result';

export const ITEM_STATUSES = ['available', 'sold', 'archived'] as const;

export type ItemStatus = (typeof ITEM_STATUSES)[number];

/**
 * The fields the status rules read and write. Whether an item sold is its sold
 * date, not its status, so an archived item still knows whether it sold.
 */
type StatusFields = {
  status: ItemStatus;
  soldAt: Date | null;
  archivedAt: Date | null;
  channels: readonly string[];
};

/** A sale ends every listing: the item is taken off every channel. */
export function markSold<T extends StatusFields>(
  item: T,
  soldAt: Date,
): Result<T, 'ITEM_NOT_AVAILABLE'> {
  if (item.status !== 'available') return fail('ITEM_NOT_AVAILABLE');
  return ok({ ...item, status: 'sold', soldAt, channels: [] });
}

/** A sold item came back: available again, and no longer a sale. */
export function receiveReturn<T extends StatusFields>(item: T): Result<T, 'ITEM_NOT_SOLD'> {
  if (item.status !== 'sold') return fail('ITEM_NOT_SOLD');
  return ok({ ...item, status: 'available', soldAt: null });
}

/** Any item can be archived: sold and settled, lost, or waiting for a repair. */
export function archive<T extends StatusFields>(
  item: T,
  archivedAt: Date,
): Result<T, 'ITEM_ALREADY_ARCHIVED'> {
  if (item.status === 'archived') return fail('ITEM_ALREADY_ARCHIVED');
  return ok({ ...item, status: 'archived', archivedAt, channels: [] });
}

/** Back to where it was before archiving: sold if it sold, otherwise available. */
export function unarchive<T extends StatusFields>(item: T): Result<T, 'ITEM_NOT_ARCHIVED'> {
  if (item.status !== 'archived') return fail('ITEM_NOT_ARCHIVED');
  return ok({ ...item, status: item.soldAt === null ? 'available' : 'sold', archivedAt: null });
}

/** The status buttons, as the API takes them. */
export const STATUS_ACTIONS = ['markSold', 'receiveReturn', 'archive', 'unarchive'] as const;
export type StatusAction = (typeof STATUS_ACTIONS)[number];

export type StatusError =
  'ITEM_NOT_AVAILABLE' | 'ITEM_NOT_SOLD' | 'ITEM_ALREADY_ARCHIVED' | 'ITEM_NOT_ARCHIVED';

/** Runs one status button's rule at `now`. */
export function applyStatusAction<T extends StatusFields>(
  item: T,
  action: StatusAction,
  now: Date,
): Result<T, StatusError> {
  switch (action) {
    case 'markSold':
      return markSold(item, now);
    case 'receiveReturn':
      return receiveReturn(item);
    case 'archive':
      return archive(item, now);
    case 'unarchive':
      return unarchive(item);
  }
}

/** Which buttons do anything for an item in this status, so the app offers only those. */
export function statusActionsFor(item: Pick<StatusFields, 'status'>): StatusAction[] {
  switch (item.status) {
    case 'available':
      return ['markSold', 'archive'];
    case 'sold':
      return ['receiveReturn', 'archive'];
    case 'archived':
      return ['unarchive'];
  }
}
