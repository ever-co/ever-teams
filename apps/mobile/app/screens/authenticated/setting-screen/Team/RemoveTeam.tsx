/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { useOrganizationTeam } from '../../../../services/hooks/useOrganization';
import { translate } from '../../../../i18n';
import { typography, useAppTheme } from '../../../../theme';
import { useStores } from '../../../../models';
import { observer } from 'mobx-react-lite';
import { SvgXml } from 'react-native-svg';
import { danGerZoneRemoveUserIcon } from '../../../../components/svgs/icons';

const RemoveTeam = observer(({ onDismiss }: { onDismiss: () => unknown }) => {
	const { colors, dark } = useAppTheme();
	const {
		teamStore: { activeTeam }
	} = useStores();
	const { onRemoveTeam, isTeamManager } = useOrganizationTeam();

	const onRemoveActiveTeam = async () => {
		if (!isTeamManager) {
			return;
		}

		await onRemoveTeam(activeTeam.id);
		onDismiss();
	};

	return (
		<View style={styles.container}>
			<TouchableWithoutFeedback onPress={() => onDismiss()}>
				<View style={styles.transparentContainer}>
					<TouchableWithoutFeedback>
						<View style={{ ...styles.circleFrame, shadowColor: dark ? 'transparent' : colors.border }}>
							<SvgXml xml={danGerZoneRemoveUserIcon} />
						</View>
					</TouchableWithoutFeedback>
				</View>
			</TouchableWithoutFeedback>
			<View style={{ ...styles.mainContainer, backgroundColor: dark ? '#1E2025' : colors.background }}>
				<Text style={{ ...styles.title, color: colors.primary }}>
					{translate('settingScreen.teamSection.areYouSure')}
				</Text>
				<Text style={styles.warningMessage}>{translate('settingScreen.teamSection.removeTeamHint')}</Text>
				<TouchableOpacity style={styles.button} onPress={() => onRemoveActiveTeam()}>
					<Text style={styles.buttonText}>{translate('settingScreen.teamSection.removeTeam')}</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
});

export default RemoveTeam;

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
