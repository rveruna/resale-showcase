import type { AppType } from '@resale/api/types';
import { hc } from 'hono/client';
import { API_URL } from '../config/apiUrl';

/**
 * The API, typed from its routes (docs/architecture.md, Server data): request and
 * response types come from the API's own code, so the app keeps no copies of them.
 */
export const api = hc<AppType>(API_URL);
