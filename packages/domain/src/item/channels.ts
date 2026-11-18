/** Where an item can be listed: the web shop and the two marketplaces. */
export const CHANNEL_KEYS = ['shop', 'ebay', 'vinted'] as const;

export type Channel = (typeof CHANNEL_KEYS)[number];

export const CHANNELS: Record<Channel, string> = { shop: 'Shop', ebay: 'eBay', vinted: 'Vinted' };
