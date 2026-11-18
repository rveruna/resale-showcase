import { getRandomValues, randomUUID } from 'expo-crypto';

/**
 * Hermes on the phone has no `crypto`; TanStack DB needs `randomUUID` for its
 * collections ("No secure random number generator available"). Browsers have
 * their own, which stays.
 */
if (typeof globalThis.crypto?.getRandomValues !== 'function') {
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: { ...globalThis.crypto, getRandomValues, randomUUID },
  });
}
