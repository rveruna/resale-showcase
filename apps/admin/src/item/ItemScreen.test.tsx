import { act, fireEvent, screen } from '@testing-library/react-native';
import { itemsCollection } from '../inventory/itemsCollection';
import { apiError, fakeApi, renderWithApi, resetApiData } from '../testing/fakeApi';
import { itemDetail } from './itemFixtures';
import type { ItemDetail } from './itemQueries';
import { ItemScreen } from './ItemScreen';

const mockRouter = {
  back: jest.fn(),
  canGoBack: () => true,
  push: jest.fn(),
  replace: jest.fn(),
  setParams: jest.fn(),
};
let mockId = 'i1';
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: mockId }),
  useRouter: () => mockRouter,
  useNavigation: () => ({ dispatch: jest.fn() }),
  usePreventRemove: jest.fn(),
}));

const choices = { brands: ['COS', 'Jigsaw'], labels: ['summer'] };
const history = {
  changes: [
    {
      id: 'c1',
      saveId: 's1',
      field: 'pricePence',
      oldValue: 2400,
      newValue: 2450,
      createdAt: '2026-10-02T09:00:00.000Z',
      createdBy: 'demo',
    },
  ],
};

type Request = Parameters<Parameters<typeof fakeApi>[0]>[0];

/** The item, its suggestions and history; `other` answers the writes. */
function answer(detail: ItemDetail, other: (request: Request) => unknown = () => undefined) {
  return fakeApi((request) => {
    if (request.method === 'GET' && request.path === '/items') return { items: [detail.summary] };
    if (request.method === 'GET' && request.path === '/items/choices') return choices;
    if (request.method === 'GET' && request.path.endsWith('/changes')) return history;
    if (request.method === 'GET') return detail;
    return other(request);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  mockId = 'i1';
});
afterEach(async () => {
  list?.unsubscribe();
  list = null;
  jest.clearAllMocks();
  await resetApiData();
  jest.useRealTimers();
});

let list: { unsubscribe: () => void } | null = null;

/** The list loaded and in use, as when the item was opened from it. */
async function loadList() {
  list = itemsCollection.subscribeChanges(() => undefined);
  await act(() => itemsCollection.toArrayWhenReady());
}

async function renderLoaded() {
  await renderWithApi(<ItemScreen />);
  await act(() => jest.runAllTimersAsync());
}

const press = (text: string) => act(() => fireEvent.press(screen.getByText(text)));

describe('the item screen', () => {
  it('shows the item and its history', async () => {
    answer(itemDetail());
    await renderLoaded();
    expect(screen.getByTestId('title-input')).toHaveDisplayValue('COS Ivory Silk Blouse');
    expect(screen.getByTestId('price-input')).toHaveDisplayValue('24.50');
    expect(screen.getByText(/£24\.00 → £24\.50/)).toBeOnTheScreen();
  });

  it('saves with the version it loaded, and the list shows the change without loading', async () => {
    const seen = answer(itemDetail(), ({ method }) =>
      method === 'PATCH'
        ? itemDetail({ pricePence: 2200, title: 'COS Ivory Silk Blouse' }, { version: 2 })
        : undefined,
    );
    await loadList();
    await renderLoaded();
    expect(screen.getByText('Save')).toBeDisabled();
    await act(() => fireEvent.changeText(screen.getByTestId('price-input'), '22'));
    expect(screen.getByText('Mark sold')).toBeDisabled();
    expect(screen.getByText('Save or discard your changes first')).toBeOnTheScreen();

    await press('Save');
    await act(() => jest.runAllTimersAsync());

    expect(seen.find((request) => request.method === 'PATCH')).toEqual({
      method: 'PATCH',
      path: '/items/i1',
      body: {
        version: 1,
        set: expect.objectContaining({ pricePence: 2200, title: 'COS Ivory Silk Blouse' }),
      },
    });
    expect(itemsCollection.get('i1')).toMatchObject({ pricePence: 2200, version: 2 });
    expect(screen.getByTestId('price-input')).toHaveDisplayValue('22');
    expect(screen.getByText('Save')).toBeDisabled();
    // The history loads again after a save.
    expect(seen.filter((request) => request.path.endsWith('/changes'))).toHaveLength(2);
    expect(seen.filter((request) => request.path === '/items')).toHaveLength(1);
  });

  it('checks the form with the domain rules before sending anything', async () => {
    const seen = answer(itemDetail());
    await renderLoaded();
    await act(() => fireEvent.changeText(screen.getByTestId('title-input'), ' '));
    await act(() => fireEvent.changeText(screen.getByTestId('price-input'), ''));
    await press('Save');
    expect(screen.getByText('A title is needed')).toBeOnTheScreen();
    expect(screen.getByText('To list it, add: price')).toBeOnTheScreen();
    expect(seen.some((request) => request.method === 'PATCH')).toBe(false);
  });

  it('offers to reload when someone else saved it meanwhile', async () => {
    let current = itemDetail();
    answer(current, ({ method }) =>
      method === 'PATCH'
        ? apiError(409, 'VERSION_CONFLICT', 'This item changed since you opened it')
        : undefined,
    );
    await renderLoaded();
    await act(() => fireEvent.changeText(screen.getByTestId('price-input'), '22'));
    await press('Save');
    await act(() => jest.runAllTimersAsync());
    expect(screen.getByText('Not saved. This item changed since you opened it')).toBeOnTheScreen();

    current = itemDetail({ pricePence: 3000 }, { version: 2 });
    answer(current);
    await press('Reload');
    await act(() => jest.runAllTimersAsync());
    expect(screen.getByTestId('price-input')).toHaveDisplayValue('30');
    expect(screen.queryByText(/Not saved/)).toBeNull();
  });

  it('marks it sold with the status button', async () => {
    const seen = answer(itemDetail(), ({ method }) =>
      method === 'POST'
        ? itemDetail(
            { status: 'sold', soldAt: '2026-11-02T10:00:00.000Z', channels: [] },
            { version: 2, statusActions: ['receiveReturn', 'archive'] },
          )
        : undefined,
    );
    await renderLoaded();
    await press('Mark sold');
    await act(() => jest.runAllTimersAsync());
    expect(seen.find((request) => request.method === 'POST')).toEqual({
      method: 'POST',
      path: '/items/i1/status',
      body: { version: 1, action: 'markSold' },
    });
    expect(screen.getByText('Return received')).toBeOnTheScreen();
    expect(screen.getByText('Sold')).toBeOnTheScreen();
  });

  it('deletes after asking, and goes back', async () => {
    const seen = answer(itemDetail(), ({ method }) =>
      method === 'DELETE' ? new Response(null, { status: 204 }) : undefined,
    );
    await renderLoaded();
    await press('Delete');
    expect(screen.getByText('Delete this item for good?')).toBeOnTheScreen();
    await act(() => fireEvent.press(screen.getByTestId('confirm-dialog-confirm')));
    // Not `runAllTimersAsync`: with navigation mocked the screen stays open, and its
    // query keeps scheduling work after the delete.
    await act(() => jest.advanceTimersByTimeAsync(1000));
    expect(seen.some((request) => request.method === 'DELETE')).toBe(true);
    expect(mockRouter.back).toHaveBeenCalled();
  });
});

describe('a new item', () => {
  beforeEach(() => {
    mockId = 'new';
  });

  it('starts empty, needs a title, and its first Save creates it', async () => {
    const created = itemDetail({ id: 'i9', title: 'Wool Coat' });
    const seen = answer(created, ({ method }) => (method === 'POST' ? created : undefined));
    await renderLoaded();
    expect(screen.getByText('New item')).toBeOnTheScreen();
    expect(screen.queryByText('A title is needed')).toBeNull();

    await act(() => fireEvent.changeText(screen.getByTestId('price-input'), '45'));
    await press('Save');
    expect(screen.getByText('A title is needed')).toBeOnTheScreen();

    await act(() => fireEvent.changeText(screen.getByTestId('title-input'), 'wool coat'));
    await press('Save');
    await act(() => jest.runAllTimersAsync());
    expect(seen.find((request) => request.method === 'POST')).toEqual({
      method: 'POST',
      path: '/items',
      body: { set: expect.objectContaining({ title: 'wool coat', pricePence: 4500 }) },
    });
    expect(mockRouter.setParams).toHaveBeenCalledWith({ id: 'i9' });
  });
});
