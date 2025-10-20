import React, { useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { View, Text, StyleSheet, Switch, ActivityIndicator, ScrollView } from 'react-native'; // NEW: ActivityIndicator
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { useQuery } from '@tanstack/react-query';
import { fetchBranches } from '@/api/branches';
import { fetchATMs } from '@/api/atms';
import * as Linking from 'expo-linking';
import Loading from '@/components/Loading';
import ErrorView from '@/components/ErrorView';

export default function BranchDetailsScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const [showATMs, setShowATMs] = React.useState(false);

	const {
		data: branches,
		isLoading,
		isError,
	} = useQuery({
		queryKey: ['branches'],
		queryFn: fetchBranches,
	});

	const branch = React.useMemo(() => branches?.find((b) => b.id === id), [branches, id]);

	const atmsQuery = useQuery({
		queryKey: ['atms'],
		queryFn: fetchATMs,
		enabled: showATMs,
	});

	if (isLoading) return <Loading />;
	if (isError || !branch) return <ErrorView />;

	const region = {
		latitude: branch.lat,
		longitude: branch.lon,
		latitudeDelta: 0.02,
		longitudeDelta: 0.02,
	};

	const hoursItems = useMemo(
		() =>
			(branch?.workingHours ?? '')
				.split(';')
				.map((s) => s.trim())
				.filter(Boolean),
		[branch?.workingHours],
	);

	return (
		<SafeAreaView style={{ flex: 1 }}>
			<View style={styles.info}>
				<Text style={styles.title}>{branch.name}</Text>
				{!!branch.address && <Text>{branch.address}</Text>}

				{hoursItems.length > 0 && (
					<View style={styles.hoursBox}>
						<Text style={styles.sectionTitle}>Hours</Text>
						<ScrollView style={styles.hoursScroll}>
							{hoursItems.map((line, idx) => (
								<Text key={idx} style={styles.hoursItem}>
									{line}
								</Text>
							))}
						</ScrollView>
					</View>
				)}

				<Text
					style={styles.link}
					onPress={() =>
						Linking.openURL(
							`https://www.google.com/maps/search/?api=1&query=${branch.lat},${branch.lon}`,
						)
					}
				>
					Open in Google Maps
				</Text>

				<View style={styles.row}>
					<Text>Show ATMs</Text>
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
						{showATMs && atmsQuery.isFetching ? <ActivityIndicator /> : null}
						<Switch value={showATMs} onValueChange={setShowATMs} />
					</View>
				</View>

				{showATMs && atmsQuery.isError ? (
					<Text style={styles.error}>Failed to load ATMs.</Text>
				) : null}
			</View>

			<MapView style={{ flex: 1 }} initialRegion={region}>
				<Marker
					coordinate={{ latitude: branch.lat, longitude: branch.lon }}
					title={branch.name}
				/>
				{showATMs &&
					atmsQuery.data?.atms.map((a) => (
						<Marker
							key={a.id}
							coordinate={{ latitude: a.lat, longitude: a.lon }}
							title={a.label ?? 'ATM'}
						/>
					))}
			</MapView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	info: { padding: 12, gap: 6 },
	title: { fontSize: 18, fontWeight: '600' },
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 8,
	},
	link: { color: '#0a84ff', marginTop: 6, fontSize: 15, textDecorationLine: 'underline' },
	error: { color: 'crimson', marginTop: 6 },
	hoursBox: {
		marginTop: 6,
		borderWidth: 1,
		borderRadius: 8,
		padding: 10,
	},
	sectionTitle: {
		fontWeight: '600',
		marginBottom: 6,
	},
	hoursScroll: {
		maxHeight: 150,
	},
	hoursItem: {
		paddingVertical: 2,
	},
});
