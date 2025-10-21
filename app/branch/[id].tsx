import React, { useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
	View,
	Text,
	StyleSheet,
	Switch,
	ActivityIndicator,
	ScrollView,
	Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useQuery } from '@tanstack/react-query';
import { fetchBranches } from '@/api/branches';
import { fetchATMs } from '@/api/atms';
import * as Linking from 'expo-linking';
import Loading from '@/components/Loading';
import ErrorView from '@/components/ErrorView';
import { color } from '@/theme/Theme';
import { ATMsErr } from '@/errors/Errors';
import type { ATMsPayload } from '@/api/schemas';

function kmBetween(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
	const R = 6371;
	const dLat = (Math.PI / 180) * (b.lat - a.lat);
	const dLon = (Math.PI / 180) * (b.lon - a.lon);
	const la1 = (Math.PI / 180) * a.lat;
	const la2 = (Math.PI / 180) * b.lat;
	const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(h));
}

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

	const branch = useMemo(() => branches?.find((b) => b.id === id), [branches, id]);

	// Typed query (v5: use gcTime instead of cacheTime)
	const atmsQuery = useQuery<ATMsPayload>({
		queryKey: ['atms'],
		queryFn: fetchATMs,
		enabled: showATMs,
		staleTime: 10 * 60 * 1000, // 10 min
		gcTime: 30 * 60 * 1000, // keep cached data around
		refetchOnMount: false,
		refetchOnWindowFocus: false,
	});

	if (isLoading) return <Loading />;
	if (isError || !branch) return <ErrorView />;

	const region = {
		latitude: branch.lat,
		longitude: branch.lon,
		latitudeDelta: 0.02,
		longitudeDelta: 0.02,
	};

	type ATM = ATMsPayload['atms'][number];
	const nearbyATMs = useMemo<ATM[]>(() => {
		const all: ATM[] = atmsQuery.data?.atms ?? [];
		const filtered = all
			.filter((atm) => Number.isFinite(atm.lat) && Number.isFinite(atm.lon))
			.filter(
				(atm) =>
					kmBetween(
						{ lat: branch.lat, lon: branch.lon },
						{ lat: atm.lat, lon: atm.lon },
					) <= 15,
			);

		if (__DEV__) {
			console.log(
				`[atms] nearby for branch ${branch.id}: ${filtered.length} items`,
				filtered.slice(0, 5).map((atm) => ({ id: atm.id, lat: atm.lat, lon: atm.lon })),
			);
		}
		return filtered;
	}, [atmsQuery.data?.atms, branch.id, branch.lat, branch.lon]);

	const hoursItems = useMemo(
		() =>
			(branch?.workingHours ?? '')
				.split(';')
				.map((s) => s.trim())
				.filter(Boolean),
		[branch?.workingHours],
	);

	return (
		<SafeAreaView style={styles.parentContainer}>
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
						<Switch
							value={showATMs}
							onValueChange={setShowATMs}
							trackColor={{ false: color.red, true: color.green }}
							thumbColor={color.deepGray}
							ios_backgroundColor={color.red}
						/>
					</View>
				</View>

				{/* Status line */}
				{showATMs && (
					<>
						{atmsQuery.isLoading || atmsQuery.isFetching ? (
							<Text style={{ marginTop: 6, opacity: 0.7 }}>
								Checking nearby ATMs…
							</Text>
						) : atmsQuery.isError ? (
							<Text style={styles.error}>
								{ATMsErr}
								{__DEV__ && atmsQuery.error instanceof Error
									? `\n${atmsQuery.error.message}`
									: ''}
							</Text>
						) : atmsQuery.isFetched ? (
							nearbyATMs.length === 0 ? (
								<Text style={{ marginTop: 6, opacity: 0.7 }}>
									No ATMs within 15 km of this branch.
								</Text>
							) : (
								<Text style={{ marginTop: 6, opacity: 0.7 }}>
									{nearbyATMs.length} ATM{nearbyATMs.length > 1 ? 's' : ''} within
									15 km.
								</Text>
							)
						) : null}
					</>
				)}
			</View>

			<MapView
				key={showATMs ? 'map-atms-on' : 'map-atms-off'}
				style={{ flex: 1 }}
				initialRegion={region}
				provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
			>
				<Marker
					key={`branch-${branch.id}`}
					coordinate={{ latitude: branch.lat, longitude: branch.lon }}
					title={branch.name}
					tracksViewChanges={false}
				/>

				{showATMs &&
					nearbyATMs.map((atm) => (
						<Marker
							key={`atm-${atm.id}`}
							coordinate={{ latitude: atm.lat, longitude: atm.lon }}
							title={atm.label ?? 'ATM'}
							tracksViewChanges={false}
						/>
					))}
			</MapView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	parentContainer: {
		flex: 1,
		backgroundColor: color.lightYellow,
	},
	info: { padding: 12, gap: 6 },
	title: { fontSize: 18, fontWeight: '600' },
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 8,
	},
	link: { color: color.blue, marginTop: 6, fontSize: 15, textDecorationLine: 'underline' },
	error: { color: 'crimson', marginTop: 6 },
	hoursBox: {
		marginTop: 6,
		borderWidth: 0.5,
		borderColor: color.blue,
		borderRadius: 8,
		padding: 10,
		backgroundColor: color.lightblue,
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
