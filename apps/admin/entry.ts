// The app's entry: the crypto polyfill first, before anything imports TanStack DB.
import './src/cryptoPolyfill';
import 'expo-router/entry';
