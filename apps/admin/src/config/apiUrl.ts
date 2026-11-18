import Constants from 'expo-constants';

/**
 * The API the app talks to: `wrangler dev` on the machine running Expo, so a
 * phone on the same Wi-Fi finds it too. `EXPO_PUBLIC_API_URL` overrides it.
 */
const devHost = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? `http://${devHost}:8787`;
