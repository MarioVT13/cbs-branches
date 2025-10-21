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
import { color } from '@/theme/Theme';
import { errorLoadingBranches } from '@/errors/Errors';
import Animated, {
	BounceInLeft,
	Easing,
	FlipInEasyX,
	SlideInLeft,
	useReducedMotion,
} from 'react-native-reanimated';

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
			<Animated.View
				entering={FlipInEasyX.duration(800).easing(Easing.out(Easing.cubic)).delay(1000)}
			>
				<View style={styles.searchBox}>
					<TextInput
						placeholder="Search by name, city, address"
						placeholderTextColor={color.deepGray}
						value={searchQuery}
						onChangeText={setSearchQuery}
						style={styles.searchInput}
						clearButtonMode="while-editing" // only ios support
					/>
				</View>
			</Animated.View>
			<FlatList
				data={filtered}
				keyExtractor={(item) => item.id}
				onRefresh={refetch}
				refreshing={false}
				renderItem={({ item, index }) => {
					// delay: 60ms per item, only for the first 12 items (no need to animate further)
					const delayMs = index < 12 ? index * 60 : 0;
					const prefersReducedMotion = useReducedMotion();

					return (
						<Animated.View
							entering={
								prefersReducedMotion || index > 12
									? undefined
									: SlideInLeft.springify()
											.damping(30)
											.stiffness(180)
											.mass(0.4)
											.easing(Easing.out(Easing.cubic))
											.delay(delayMs)
							}
						>
							<Link href={`/branch/${item.id}`} asChild>
								<BranchListItem branch={item} />
							</Link>
						</Animated.View>
					);
				}}
				contentContainerStyle={{ padding: 12 }}
				initialNumToRender={20}
				windowSize={10}
			/>
			{(!filtered || filtered.length === 0) && (
				<View style={styles.noResultTextContainer}>
					<Text style={styles.noResultText}>{errorLoadingBranches}</Text>
				</View>
			)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	parentContainer: { flex: 1, backgroundColor: color.lightRust },
	searchBox: { paddingHorizontal: 12, paddingTop: 12 },
	searchInput: {
		borderWidth: 0.5,
		borderColor: color.copper,
		borderRadius: 8,
		padding: 10,
		backgroundColor: color.lightYellow,
	},
	noResultTextContainer: { position: 'absolute', marginTop: '50%', alignSelf: 'center' },
	noResultText: { fontSize: 15, color: color.antiqueBronze },
});
