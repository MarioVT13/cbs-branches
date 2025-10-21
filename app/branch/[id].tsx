import React, { useMemo, useRef, useEffect, useState } from 'react';
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
import MapView, { Marker, PROVIDER_GOOGLE, LatLng, Region } from 'react-native-maps';
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

function regionForCoords(
	coords: LatLng[],
	opts?: { paddingFactor?: number; minDelta?: number; maxDelta?: number },
): Region {
	const paddingFactor = opts?.paddingFactor ?? 1.3;
	const minDelta = opts?.minDelta ?? 0.02;
	const maxDelta = opts?.maxDelta ?? 8;

	if (coords.length === 1) {
		return {
			latitude: coords[0].latitude,
			longitude: coords[0].longitude,
			latitudeDelta: minDelta,
			longitudeDelta: minDelta,
		};
	}

	let minLat = Infinity,
		maxLat = -Infinity,
		minLon = Infinity,
		maxLon = -Infinity;

	for (const c of coords) {
		minLat = Math.min(minLat, c.latitude);
		maxLat = Math.max(maxLat, c.latitude);
		minLon = Math.min(minLon, c.longitude);
		maxLon = Math.max(maxLon, c.longitude);
	}

	const centerLat = (minLat + maxLat) / 2;
	const centerLon = (minLon + maxLon) / 2;
	let latDelta = (maxLat - minLat) * paddingFactor;
	let lonDelta = (maxLon - minLon) * paddingFactor;

	latDelta = Math.min(Math.max(latDelta, minDelta), maxDelta);
	lonDelta = Math.min(Math.max(lonDelta, minDelta), maxDelta);

	return {
		latitude: centerLat,
		longitude: centerLon,
		latitudeDelta: latDelta,
		longitudeDelta: lonDelta,
	};
}

export default function BranchDetailsScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const [showATMs, setShowATMs] = useState(false);
	const [radiusKm] = useState(15); // single source of truth for radius
	const mapRef = useRef<MapView>(null);

	const {
		data: branches,
		isLoading,
		isError,
	} = useQuery({
		queryKey: ['branches'],
		queryFn: fetchBranches,
	});

	const branch = useMemo(() => branches?.find((b) => b.id === id), [branches, id]);

	const atmsQuery = useQuery<ATMsPayload>({
		queryKey: ['atms'],
		queryFn: fetchATMs,
		enabled: showATMs, // only fetch when toggled on
		staleTime: 10 * 60 * 1000,
		gcTime: 30 * 60 * 1000,
		refetchOnMount: false,
		refetchOnWindowFocus: false,
	});

	if (isLoading) return <Loading />;
	if (isError || !branch) return <ErrorView />;

	// friendlier default zoom for branch-only view
	const branchRegion: Region = {
		latitude: branch.lat,
		longitude: branch.lon,
		latitudeDelta: 0.05, // was 0.02; zoomed out just a bit
		longitudeDelta: 0.05,
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
					) <= radiusKm,
			);

		if (__DEV__) {
			const distances = filtered
				.map((atm) => ({
					id: atm.id,
					d: kmBetween(
						{ lat: branch.lat, lon: branch.lon },
						{ lat: atm.lat, lon: atm.lon },
					),
				}))
				.sort((a, b) => a.d - b.d)
				.slice(0, 3);
			console.log(`[atms] ${filtered.length} within ${radiusKm}km. nearest=`, distances);
		}
		return filtered;
	}, [atmsQuery.data?.atms, branch.id, branch.lat, branch.lon, radiusKm]);

	// camera logic - only adjust when we have the data we need
	useEffect(() => {
		const map = mapRef.current;
		if (!map) return;

		if (!showATMs) {
			// toggle OFF → go to a comfortable branch-only region
			map.animateToRegion(branchRegion, 350);
			return;
		}

		// toggle ON but data not ready yet → do not change zoom (prevents the “zoom into 1 point” feel)
		if (!atmsQuery.isFetched) return;

		// data is ready:
		if (nearbyATMs.length > 0) {
			const coords: LatLng[] = [
				{ latitude: branch.lat, longitude: branch.lon },
				...nearbyATMs.map((a) => ({ latitude: a.lat, longitude: a.lon })),
			];
			const region = regionForCoords(coords, {
				paddingFactor: 1.4,
				minDelta: 0.02,
				maxDelta: 6,
			});
			// give it a tick to ensure markers are mounted before animating
			requestAnimationFrame(() => map.animateToRegion(region, 450));
		} else {
			// no ATMs in range: keep a mid zoom on the branch (don’t zoom all the way in)
			map.animateToRegion(branchRegion, 350);
		}
	}, [showATMs, atmsQuery.isFetched, nearbyATMs.length, branchRegion]);

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
					<Text>Show ATMs (≤ {radiusKm} km)</Text>
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
									No ATMs within {radiusKm} km of this branch.
								</Text>
							) : (
								<Text style={{ marginTop: 6, opacity: 0.7 }}>
									{nearbyATMs.length} ATM{nearbyATMs.length > 1 ? 's' : ''} within{' '}
									{radiusKm} km.
								</Text>
							)
						) : null}
					</>
				)}
			</View>

			<MapView
				ref={mapRef}
				key={showATMs ? 'map-atms-on' : 'map-atms-off'}
				style={{ flex: 1 }}
				initialRegion={branchRegion}
				provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
			>
				<Marker
					key={`branch-${branch.id}`}
					coordinate={{ latitude: branch.lat, longitude: branch.lon }}
					title={branch.name}
					tracksViewChanges={false}
					pinColor="#007aff"
				/>

				{showATMs &&
					nearbyATMs.map((atm) => (
						<Marker
							key={`atm-${atm.id}`}
							coordinate={{ latitude: atm.lat, longitude: atm.lon }}
							title={atm.label ?? 'ATM'}
							tracksViewChanges={false}
							pinColor="#34c759"
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
	hoursScroll: { maxHeight: 150 },
	hoursItem: { paddingVertical: 2 },
});
