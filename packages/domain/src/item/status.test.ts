import {
  applyStatusAction,
  archive,
  markSold,
  receiveReturn,
  STATUS_ACTIONS,
  statusActionsFor,
  unarchive,
} from './status';

const at = new Date('2026-11-01T10:00:00Z');
const available = {
  status: 'available' as const,
  soldAt: null,
  archivedAt: null,
  channels: ['ebay', 'vinted'],
};

describe('status rules', () => {
  it('a sale takes the item off every channel', () => {
    expect(markSold(available, at)).toEqual({
      ok: true,
      value: { ...available, status: 'sold', soldAt: at, channels: [] },
    });
  });

  it('only an available item can sell', () => {
    const sold = { ...available, status: 'sold' as const, soldAt: at };
    expect(markSold(sold, at)).toEqual({ ok: false, error: 'ITEM_NOT_AVAILABLE' });
  });

  it('a return makes a sold item available again', () => {
    const sold = { ...available, status: 'sold' as const, soldAt: at, channels: [] };
    expect(receiveReturn(sold)).toEqual({
      ok: true,
      value: { ...sold, status: 'available', soldAt: null },
    });
    expect(receiveReturn(available)).toEqual({ ok: false, error: 'ITEM_NOT_SOLD' });
  });

  it('archiving twice is refused', () => {
    const archived = archive(available, at);
    expect(archived).toEqual({
      ok: true,
      value: { ...available, status: 'archived', archivedAt: at, channels: [] },
    });
    if (!archived.ok) throw new Error('archive failed');
    expect(archive(archived.value, at)).toEqual({ ok: false, error: 'ITEM_ALREADY_ARCHIVED' });
  });

  it('unarchiving goes back to sold if it sold, otherwise available', () => {
    const archivedUnsold = { ...available, status: 'archived' as const, archivedAt: at };
    const archivedSold = { ...archivedUnsold, soldAt: at };
    expect(unarchive(archivedUnsold)).toMatchObject({ ok: true, value: { status: 'available' } });
    expect(unarchive(archivedSold)).toMatchObject({ ok: true, value: { status: 'sold' } });
    expect(unarchive(available)).toEqual({ ok: false, error: 'ITEM_NOT_ARCHIVED' });
  });

  it('offers exactly the buttons that succeed', () => {
    const items = [
      available,
      { ...available, status: 'sold' as const, soldAt: at },
      { ...available, status: 'archived' as const, archivedAt: at },
    ];
    for (const item of items) {
      const offered = statusActionsFor(item);
      for (const action of STATUS_ACTIONS) {
        expect(applyStatusAction(item, action, at).ok).toBe(offered.includes(action));
      }
    }
  });
});
