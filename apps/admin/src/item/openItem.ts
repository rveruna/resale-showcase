import { router } from 'expo-router';
import { NEW_ITEM } from './newItem';

/** The app has no tabs: the item opens on top, and Back returns to the list. */
export const openItem = (id: string) => router.push({ pathname: '/items/[id]', params: { id } });

/** The item screen before its first Save. */
export const openNewItem = () => openItem(NEW_ITEM);
