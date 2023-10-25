import { View, Text, ViewStyle, TouchableOpacity, StyleSheet } from 'react-native';
import React, { FC } from 'react';
import { AuthenticatedDrawerScreenProps } from '../../../navigators/AuthenticatedNavigator';
import { Screen } from '../../../components';
import Animated from 'react-native-reanimated';
import { typography, useAppTheme } from '../../../theme';
import { AntDesign } from '@expo/vector-icons';
import { translate } from '../../../i18n';

export const MembersSettingsScreen: FC<AuthenticatedDrawerScreenProps<'MembersSettingsScreen'>> = (_props) => {
	const { colors } = useAppTheme();
	const { navigation } = _props;
	const fall = new Animated.Value(1);

	return (
		<Screen
			preset="scroll"
			ScrollViewProps={{ bounces: false }}
			contentContainerStyle={[$container, { backgroundColor: colors.background2 }]}
			safeAreaEdges={['top']}
		>
			<Animated.View style={{ opacity: Animated.add(0.1, Animated.multiply(fall, 1.0)) }}>
				<View style={[$headerContainer, { backgroundColor: colors.background }]}>
					<View style={[styles.container, { backgroundColor: colors.background }]}>
						<TouchableOpacity onPress={() => navigation.navigate('Setting')}>
							<AntDesign name="arrowleft" size={24} color={colors.primary} />
						</TouchableOpacity>
						<Text style={[styles.title, { color: colors.primary }]}>
							{translate('settingScreen.membersSettingsScreen.mainTitle')}
						</Text>
					</View>
				</View>
				<Text>Members list will be here</Text>
			</Animated.View>
		</Screen>
	);
};

const $container: ViewStyle = {
	flex: 1
};

const $headerContainer: ViewStyle = {
	padding: 20,
	paddingVertical: 16,
	shadowColor: 'rgba(0, 0, 0, 0.6)',
	shadowOffset: {
		width: 0,
		height: 2
	},
	shadowOpacity: 0.07,
	shadowRadius: 1.0,
	elevation: 1,
	zIndex: 10
};

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
		flexDirection: 'row',
		width: '100%'
	},

	title: {
		alignSelf: 'center',
		fontFamily: typography.primary.semiBold,
		fontSize: 16,
		textAlign: 'center',
		width: '80%'
	}
});
