/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import React, { FC } from 'react';
import { FontAwesome5 } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { typography, useAppTheme } from '../theme';
import { translate } from '../i18n';

interface Props {
	onPress: () => unknown;
}

const NoTeam: FC<Props> = ({ onPress }) => {
	const { colors, dark } = useAppTheme();
	return (
		<View style={styles.container}>
			<FontAwesome5 name="user-friends" size={34} color="#3826A6" />
			<Text style={{ ...styles.primaryText, color: colors.primary }}>
				{translate('noTeamScreen.createYourTeam')}
			</Text>
			<Text
				style={{
					...styles.small,
					color: !dark ? 'rgba(40, 32, 72, 0.4)' : 'rgba(255, 255, 255, 0.5)'
				}}
			>
				{translate('noTeamScreen.hintMessage')}
			</Text>

			<TouchableOpacity style={styles.createButton} onPress={() => onPress()}>
				<Text style={{ ...styles.buttonText, color: '#fff' }}>
					{translate('teamScreen.createNewTeamButton')}
				</Text>
			</TouchableOpacity>
		</View>
	);
};

export default NoTeam;

const styles = StyleSheet.create({
	buttonText: {
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 14
	},
	container: {
		alignItems: 'center',
		flex: 1,
		justifyContent: 'center',
		paddingHorizontal: 20
	},
	createButton: {
		alignItems: 'center',
		backgroundColor: '#3826A6',
		borderRadius: 10,
		height: 47,
		justifyContent: 'center',
		marginTop: 16,
		width: '50%'
	},
	primaryText: {
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 18,
		marginTop: 10
	},
	small: {
		color: 'rgba(40, 32, 72, 0.4)',
		fontFamily: typography.fonts.PlusJakartaSans.medium,
		fontSize: 16,
		marginTop: 12,
		textAlign: 'center'
	}
});
