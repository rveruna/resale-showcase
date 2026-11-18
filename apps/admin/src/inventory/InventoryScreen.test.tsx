import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { openItem } from '../item/openItem';
import { apiError, fakeApi, renderWithApi, resetApiData } from '../testing/fakeApi';
import { inventoryItem } from './inventoryFixtures';
import { InventoryScreen } from './InventoryScreen';

jest.mock('../item/openItem', () => ({ openItem: jest.fn(), openNewItem: jest.fn() }));

const choices = { brands: ['COS'], labels: ['summer'] };

/** Answers `/items` with `items`, the suggestions with `choices`, and anything else with `other`. */
function answer(items: unknown[], other: Parameters<typeof fakeApi>[0] = () => undefined) {
  return fakeApi((request) =>
    request.path === '/items'
      ? { items }
      : request.path === '/items/choices'
        ? choices
        : other(request),
  );
}

beforeEach(() => jest.useFakeTimers());
afterEach(async () => {
  await resetApiData();
  jest.useRealTimers();
});

async function renderLoaded() {
  await renderWithApi(<InventoryScreen />);
  await act(() => jest.runAllTimersAsync());
}

const titles = () => screen.queryAllByTestId(/^row-/).map((row) => row.props.testID);

describe('the inventory list', () => {
  it('shows the available items newest first, with counts per view', async () => {
    answer([
      inventoryItem('1', { title: 'Silk Blouse' }),
      inventoryItem('2', { title: 'Wool Coat', status: 'sold' }),
      inventoryItem('3', { title: 'Linen Shirt', pricePence: null, toCheck: ['price'] }),
    ]);
    await renderLoaded();
    expect(titles()).toEqual(['row-3', 'row-1']);
    expect(screen.getByText('Available 2')).toBeOnTheScreen();
    expect(screen.getByText('To check 1')).toBeOnTheScreen();
    expect(screen.getByText('Sold 1')).toBeOnTheScreen();
    expect(screen.getByText('Needs price')).toBeOnTheScreen();
  });

  it('switches view, searches and sorts without asking the API again', async () => {
    const seen = answer([
      inventoryItem('1', { title: 'Silk Blouse', brand: 'COS', pricePence: 3000 }),
      inventoryItem('2', { title: 'Wool Coat', status: 'sold' }),
      inventoryItem('3', { title: 'Linen Shirt', pricePence: 1000 }),
    ]);
    await renderLoaded();
    const loads = seen.length;

    await act(() => fireEvent.press(screen.getByText('Sold 1')));
    expect(titles()).toEqual(['row-2']);

    await act(() => fireEvent.press(screen.getByText('Available 2')));
    await act(() => fireEvent.changeText(screen.getByPlaceholderText(/Search/), 'cos'));
    expect(titles()).toEqual(['row-1']);

    await act(() => fireEvent.changeText(screen.getByPlaceholderText(/Search/), ''));
    await act(() => fireEvent.press(within(screen.getByTestId('sorts')).getByText('Price')));
    expect(titles()).toEqual(['row-1', 'row-3']);
    await act(() => fireEvent.press(within(screen.getByTestId('sorts')).getByText('Price ↓')));
    expect(titles()).toEqual(['row-3', 'row-1']);

    expect(seen).toHaveLength(loads);
  });

  it('pages through ten at a time', async () => {
    answer(Array.from({ length: 12 }, (_, index) => inventoryItem(String(index + 1))));
    await renderLoaded();
    expect(titles()).toHaveLength(10);
    expect(screen.getByText('Page 1 of 2')).toBeOnTheScreen();
    await act(() => fireEvent.press(screen.getByText('Next')));
    expect(titles()).toEqual(['row-2', 'row-1']);
  });

  it('says when it cannot load, and loads again on Try again', async () => {
    // TanStack DB logs the failed load as well as reporting it.
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    let fail = true;
    fakeApi(({ path }) =>
      path === '/items/choices'
        ? choices
        : fail
          ? apiError(500, 'INTERNAL', 'Something went wrong')
          : { items: [inventoryItem('1')] },
    );
    await renderLoaded();
    expect(screen.getByText(/couldn’t load: Something went wrong/)).toBeOnTheScreen();
    fail = false;
    await act(() => fireEvent.press(screen.getByText('Try again')));
    await act(() => jest.runAllTimersAsync());
    expect(titles()).toEqual(['row-1']);
  });

  it('opens an item', async () => {
    answer([inventoryItem('1', { title: 'Silk Blouse' })]);
    await renderLoaded();
    await act(() => fireEvent.press(screen.getByText('Silk Blouse')));
    expect(openItem).toHaveBeenCalledWith('1');
  });
});

describe('bulk status buttons', () => {
  const items = [
    inventoryItem('1', { title: 'Silk Blouse', version: 3 }),
    inventoryItem('2', { title: 'Linen Shirt', version: 1, channels: ['ebay'] }),
  ];
  const tick = (title: string) => fireEvent.press(screen.getByLabelText(`Tick ${title}`));

  it('offers only the buttons that apply to every ticked item', async () => {
    answer(items);
    await renderLoaded();
    await act(() => tick('Silk Blouse'));
    const bar = within(screen.getByTestId('bulk-bar'));
    expect(bar.getByText('Archive')).toBeEnabled();
    expect(bar.getByText('Unarchive')).toBeDisabled();
    expect(bar.getByText('1 ticked')).toBeOnTheScreen();
  });

  it('archives at once, then keeps the server’s rows and unticks them', async () => {
    let release: () => void = () => undefined;
    const seen = answer(items, async ({ method, path, body }) => {
      if (method !== 'POST' || path !== '/items/status') return undefined;
      await new Promise<void>((done) => (release = done));
      const { items: sent } = body as { items: { id: string; version: number }[] };
      return {
        items: sent.map(({ id, version }) => ({
          ...items.find((item) => item.id === id),
          status: 'archived',
          channels: [],
          version: version + 1,
        })),
      };
    });
    await renderLoaded();
    await act(() => tick('Silk Blouse'));
    await act(() => tick('Linen Shirt'));
    await act(() => fireEvent.press(within(screen.getByTestId('bulk-bar')).getByText('Archive')));

    // Optimistic: gone from Available before the API has answered.
    expect(titles()).toEqual([]);
    expect(screen.getByText('Archived 2')).toBeOnTheScreen();
    expect(seen.at(-1)).toEqual({
      method: 'POST',
      path: '/items/status',
      body: {
        action: 'archive',
        items: [
          { id: '1', version: 3 },
          { id: '2', version: 1 },
        ],
      },
    });

    await act(async () => {
      release();
      await jest.runAllTimersAsync();
    });
    expect(screen.queryByTestId('bulk-bar')).toBeNull();
    await act(() => fireEvent.press(screen.getByText('Archived 2')));
    expect(titles()).toEqual(['row-2', 'row-1']);
  });

  it('puts every row back and says why when the API refuses', async () => {
    const seen = answer(items, ({ path }) =>
      path === '/items/status'
        ? apiError(409, 'VERSION_CONFLICT', 'This item changed since you opened it')
        : undefined,
    );
    await renderLoaded();
    await act(() => tick('Silk Blouse'));
    await act(() => fireEvent.press(within(screen.getByTestId('bulk-bar')).getByText('Mark sold')));
    await act(() => jest.runAllTimersAsync());

    expect(titles()).toEqual(['row-2', 'row-1']);
    expect(
      screen.getByText('Nothing changed. This item changed since you opened it'),
    ).toBeOnTheScreen();
    // Still ticked for another go, and the list loaded again for the new versions.
    expect(screen.getByText('1 ticked')).toBeOnTheScreen();
    expect(seen.filter((request) => request.path === '/items')).toHaveLength(2);
  });
});
