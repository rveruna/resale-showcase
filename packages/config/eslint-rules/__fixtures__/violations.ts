// Intentionally breaks the shared rules; linted by eslint-base.test.js.
type Item = { title: string };

export const parse = (raw: unknown): Item => raw as Item;

export const loose = (value: any): string => String(value);

export const label = (title: string): string => (title ? title : 'untitled');
