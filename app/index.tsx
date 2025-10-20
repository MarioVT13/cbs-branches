import { useMemo, useState } from 'react';
import { View, TextInput, FlatList, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { fetchBranches } from '@/api/branches';
import { Branch } from '@/api/schemas';
import { Link } from 'expo-router';
import { useDebounce } from '@/hooks/useDebounce';
import BranchListItem from '@/components/BranchListItem';
import Loading from '@/components/Loading';
import ErrorView from '@/components/ErrorView';

export default function BranchListScreen() {
	const { data, isLoading, isError, error, refetch } = useQuery({
		queryKey: ['branches'],
		queryFn: fetchBranches,
		retry: 0, // don't keep retrying while debugging
	});
	const [searchQuery, setSearchQuery] = useState('');
	const debounced = useDebounce(searchQuery, 200);

	const list: Branch[] = useMemo(() => data ?? [], [data]);
	const filtered = useMemo(() => {
		const normalizedQuery = debounced.trim().toLowerCase();
		if (!normalizedQuery) return list;

		return list.filter((b) =>
			[b.name, b.city, b.address]
				.filter(Boolean)
				.some((s) => s!.toLowerCase().includes(normalizedQuery)),
		);
	}, [list, debounced]);

	if (isLoading) return <Loading />;
	if (isError) {
		const msg =
			error instanceof Error
				? error.message
				: typeof error === 'string'
				? error
				: JSON.stringify(error);
		return <ErrorView message={msg} />;
	}

	return (
		<SafeAreaView style={styles.parentContainer}>
			<View style={styles.searchBox}>
				<TextInput
					placeholder="Search by name, city, address"
					value={searchQuery}
					onChangeText={setSearchQuery}
					style={styles.searchInput}
				/>
			</View>
			<FlatList
				data={filtered}
				keyExtractor={(item) => item.id}
				onRefresh={refetch}
				refreshing={false}
				renderItem={({ item }) => (
					<Link href={`/branch/${item.id}`} asChild>
						<BranchListItem branch={item} />
					</Link>
				)}
				contentContainerStyle={{ padding: 12 }}
				initialNumToRender={20}
				windowSize={10}
			/>
			{(!filtered || filtered.length === 0) && (
				<View style={styles.noResultTextContainer}>
					<Text style={styles.noResultText}>No branches match your search.</Text>
				</View>
			)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	parentContainer: { flex: 1, backgroundColor: '#FFF' },
	searchBox: { paddingHorizontal: 12, paddingTop: 12 },
	searchInput: { borderWidth: 1, borderRadius: 8, padding: 10, backgroundColor: '#FFFFE0' },
	noResultTextContainer: { position: 'absolute', marginTop: '50%', alignSelf: 'center' },
	noResultText: { fontSize: 15 },
});
