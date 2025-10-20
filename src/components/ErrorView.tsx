import { View, Text, ScrollView } from 'react-native';

export default function ErrorView({ message = 'Something went wrong.' }: { message?: string }) {
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
