import { Slot } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "../components/ErrorBoundary";

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Slot />
        </QueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
