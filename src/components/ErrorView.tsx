import { View, Text, ScrollView } from 'react-native';
import { genericErr } from '@/errors/Errors';

export default function ErrorView({ message = genericErr }: { message?: string }) {
	return (
		<View style={{ flex: 1, padding: 16 }}>
			<ScrollView
				contentContainerStyle={{
					flexGrow: 1,
					justifyContent: 'center',
					alignItems: 'center',
				}}
			>
				<Text style={{ textAlign: 'center' }}>{message}</Text>
			</ScrollView>
		</View>
	);
}
