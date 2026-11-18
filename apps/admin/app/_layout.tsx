import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { queryClient } from '../src/api/queryClient';

/** The query cache around every screen; no headers, each screen draws its own. */
export default function RootLayout() {
  // Every screen starts below the status bar and the Dynamic Island.
  const { top } = useSafeAreaInsets();
  return (
    <QueryClientProvider client={queryClient}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { paddingTop: top, backgroundColor: '#fff' },
        }}
      />
      <StatusBar style="auto" />
    </QueryClientProvider>
  );
}
