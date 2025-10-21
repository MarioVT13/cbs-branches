import React, { useMemo } from 'react';
import { Text, StyleSheet, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import { Branch } from '@/api/schemas';
import { color } from '@/theme/Theme';

type Props = { branch: Branch } & PressableProps;

export default function BranchListItem({ branch, style: styleProp, ...pressableProps }: Props) {
	const composedStyle = useMemo<PressableProps['style']>(() => {
		if (typeof styleProp === 'function') {
			return (state) => [styles.card, styleProp(state)];
		}
		return [styles.card, styleProp] as StyleProp<ViewStyle>;
	}, [styleProp]);

	return (
		<Pressable {...pressableProps} style={composedStyle}>
			<Text style={styles.title}>{branch.name}</Text>
			{!!branch.city && <Text style={styles.sub}>{branch.city}</Text>}
			{!!branch.address && <Text style={styles.addr}>{branch.address}</Text>}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	card: {
		padding: 14,
		borderRadius: 12,
		borderWidth: 0.5,
		marginBottom: 10,
		backgroundColor: color.lightblue,
		borderColor: color.blue,
	},
	title: { fontSize: 16, fontWeight: '600' },
	sub: { marginTop: 4, opacity: 0.8 },
	addr: { marginTop: 2, opacity: 0.8 },
});
