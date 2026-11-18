/** Every Drizzle client (D1 in the API, SQLite in tests) maps camelCase to the migrations' snake_case. */
export const DRIZZLE_OPTIONS = { casing: 'snake_case' } as const;
