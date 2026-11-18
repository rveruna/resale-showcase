import { defineConfig } from 'drizzle-kit';

/** `pnpm generate` writes the SQL migration; Wrangler applies it to D1. */
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/schema/*.ts',
  out: './migrations',
  casing: 'snake_case',
});
