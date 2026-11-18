import type { StatusAction } from '@resale/domain/item/status';

/** What each status button says, on the item screen and the list's bulk bar. */
export const STATUS_ACTION_LABELS: Record<StatusAction, string> = {
  markSold: 'Mark sold',
  receiveReturn: 'Return received',
  archive: 'Archive',
  unarchive: 'Unarchive',
};
