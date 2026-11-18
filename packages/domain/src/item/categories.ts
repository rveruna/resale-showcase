/** The categories an item can be in. */
export const CATEGORY_KEYS = [
  'tops',
  'shirts',
  'dresses',
  'skirts',
  'trousers',
  'knitwear',
  'coats',
  'accessories',
] as const;

export type Category = (typeof CATEGORY_KEYS)[number];

/** How the app names each category. */
export const CATEGORIES: Record<Category, string> = {
  tops: 'Tops',
  shirts: 'Shirts & blouses',
  dresses: 'Dresses',
  skirts: 'Skirts',
  trousers: 'Trousers',
  knitwear: 'Knitwear',
  coats: 'Coats & jackets',
  accessories: 'Accessories',
};

/** Accessories (scarves, belts) have no size; everything else needs one to list. */
export const hasSize = (category: Category) => category !== 'accessories';
