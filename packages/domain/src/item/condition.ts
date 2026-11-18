/** The condition scale, best first. */
export const CONDITION_KEYS = ['newWithTags', 'likeNew', 'good', 'fair'] as const;

export type Condition = (typeof CONDITION_KEYS)[number];

export const CONDITIONS: Record<Condition, string> = {
  newWithTags: 'New with tags',
  likeNew: 'Like new',
  good: 'Good',
  fair: 'Fair',
};
