/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { useCallback } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { translate } from '../../../../i18n';
import { useUser } from '../../../../services/hooks/features/useUser';
import { useOrganizationTeam } from '../../../../services/hooks/useOrganization';
import { typography, useAppTheme } from '../../../../theme';

const UserRemoveAccount = ({
	onDismiss,
	userId,
	actionType
}: {
	onDismiss: () => unknown;
	userId: string;
	actionType: 'Delete' | 'Remove';
}) => {
	const { colors, dark } = useAppTheme();
	const { removeUserFromAllTeams } = useOrganizationTeam();
	const { deleteUser } = useUser();

	const onSubmit = useCallback(async () => {
		if (actionType === 'Remove') {
			await removeUserFromAllTeams(userId);
			onDismiss();
			return;
		}

		await deleteUser(userId);
		onDismiss();
	}, [userId]);

	return (
		<View style={styles.container}>
			<TouchableWithoutFeedback onPress={() => onDismiss()}>
				<View style={styles.transparentContainer}>
					<TouchableWithoutFeedback>
						<View style={{ ...styles.circleFrame, shadowColor: colors.border }}>
							<Image source={require('../../../../../assets/images/new/user-remove.png')} />
						</View>
					</TouchableWithoutFeedback>
				</View>
			</TouchableWithoutFeedback>
			<View style={{ ...styles.mainContainer, backgroundColor: dark ? '#1E2025' : colors.background }}>
				<Text style={{ ...styles.title, color: colors.primary }}>Are you sure ?</Text>
				<Text style={styles.warningMessage}>
					{actionType === 'Delete'
						? translate('settingScreen.personalSection.deleteAccountHint')
						: translate('settingScreen.personalSection.removeAccountHint')}
				</Text>
				<TouchableOpacity style={styles.button} onPress={() => onSubmit()}>
					<Text style={styles.buttonText}>Remove Everywhere</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
};

export default UserRemoveAccount;

const styles = StyleSheet.create({
	button: {
		alignItems: 'center',
		backgroundColor: '#DA5E5E',
		borderRadius: 12,
		height: 57,
		justifyContent: 'center',
		marginVertical: 40,
		width: '100%'
	},
	buttonText: {
		color: '#fff',
		fontFamily: typography.primary.semiBold,
		fontSize: 18
	},
	circleFrame: {
		alignItems: 'center',
		alignSelf: 'center',
		backgroundColor: '#DA5E5E',
		borderRadius: 48,
		elevation: 1,
		height: 84,
		justifyContent: 'center',
		position: 'absolute',
		shadowOffset: { width: 0, height: 5 },
		shadowOpacity: 1,
		width: 84,
		zIndex: 1000
	},
	container: {
		width: '100%'
	},
	mainContainer: {
		backgroundColor: '#fff',
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		height: '100%',
		paddingHorizontal: 25,
		paddingTop: 56,
		zIndex: 999
	},
	title: {
		fontFamily: typography.primary.semiBold,
		fontSize: 24,
		textAlign: 'center',
		width: '100%'
	},
	transparentContainer: {
		height: '5%',
		zIndex: 1000
	},
	warningMessage: {
		color: '#6C7278',
		fontFamily: typography.primary.medium,
		fontSize: 14,
		marginTop: 16,
		textAlign: 'center',
		width: '100%'
	}
});
