import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: { staleTime: 5 * 60 * 1000 }, // cache branches for 5min
	},
});

export default function RootLayout() {
	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<SafeAreaProvider>
				<QueryClientProvider client={queryClient}>
					<Stack screenOptions={{ headerTitle: 'CBS Branches' }} />
				</QueryClientProvider>
			</SafeAreaProvider>
		</GestureHandlerRootView>
	);
}
