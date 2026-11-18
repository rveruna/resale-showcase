import { QueryClient } from '@tanstack/react-query';

/**
 * The one cache of server data (docs/architecture.md, Server data). One retry, so
 * a failure shows within seconds rather than after Query's default three.
 */
export const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });
