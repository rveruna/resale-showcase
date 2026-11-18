import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render } from '@testing-library/react-native';
import { createElement, type ReactElement, type ReactNode } from 'react';
import { queryClient } from '../api/queryClient';
import { itemsCollection } from '../inventory/itemsCollection';

type Request = { method: string; path: string; body: unknown };

/** An error answer in the API's shape. */
export const apiError = (status: number, code: string, message: string) =>
  new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/**
 * Replaces `fetch`, so tests run the real client, cache and collection
 * (docs/architecture.md, Testing): `answer` gets each request and returns a JSON
 * body, or a `Response` as it is; throwing is a lost connection. Returns the
 * requests seen.
 */
export function fakeApi(answer: (request: Request) => unknown): Request[] {
  const seen: Request[] = [];
  globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const request = {
      method: init?.method ?? 'GET',
      path: `${url.pathname}${url.search}`,
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    };
    seen.push(request);
    const body = await answer(request);
    return body instanceof Response
      ? body
      : new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
  });
  return seen;
}

/** The app's query cache, as `app/_layout.tsx` provides it. */
export const ApiProvider = ({ children }: { children: ReactNode }) =>
  createElement(QueryClientProvider, { client: queryClient }, children);

/** Renders inside the app's query cache. */
export const renderWithApi = (ui: ReactElement) => render(ui, { wrapper: ApiProvider });

/**
 * Forgets all server data, so each test starts from an empty cache. Needs
 * fake timers: an unmounted live query lets go of its collection on a timer
 * (and a real one would keep Jest from exiting).
 */
export async function resetApiData() {
  await cleanup();
  await jest.runAllTimersAsync();
  queryClient.clear();
  await itemsCollection.cleanup();
}
