import { createApp } from './app';
import { makeDeps } from './deps';
import type { Bindings } from './env';

const app = createApp(makeDeps);

export default { fetch: app.fetch } satisfies ExportedHandler<Bindings>;
