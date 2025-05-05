/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useOrganizationTeam } from '../../../../services/hooks/useOrganization';
import { useStores } from '../../../../models';
import { translate } from '../../../../i18n';
import { limitTextCharaters } from '../../../../helpers/sub-text';
import { Toggle } from '../../../../components/Toggle';
import { typography, useAppTheme } from '../../../../theme';

interface Props {}
const SwithTimeTracking: FC<Props> = observer(() => {
	const { colors } = useAppTheme();
	const { currentUser, toggleTimeTracking } = useOrganizationTeam();
	const {
		teamStore: { setIsTrackingEnabled }
	} = useStores();
	const [isEnabled, setIsEnabled] = useState(currentUser?.isTrackingEnabled);

	const toggleSwitch = useCallback(async () => {
		const { response } = await toggleTimeTracking(currentUser, !isEnabled);
		if (response.ok) {
			setIsEnabled((prev) => !prev);
		}
	}, [currentUser, isEnabled]);

	useEffect(() => {
		setIsTrackingEnabled(currentUser?.isTrackingEnabled);
		setIsEnabled(currentUser?.isTrackingEnabled);
	}, [currentUser]);
	return (
		<View style={styles.container}>
			<View style={styles.wrapperInfo}>
				<Text style={[styles.infoTitle, { color: colors.primary }]}>
					{translate('settingScreen.teamSection.timeTracking')}
				</Text>
				<Text style={[styles.infoText, { color: colors.tertiary }]}>
					{limitTextCharaters({
						text: translate('settingScreen.teamSection.timeTrackingHint'),
						numChars: 77
					})}
				</Text>
			</View>
			<Toggle
				inputInnerStyle={{ backgroundColor: '#DBD3FA' }}
				inputDetailStyle={{ backgroundColor: '#3826A6' }}
				onPress={() => toggleSwitch()}
				variant="switch"
				value={isEnabled}
			/>
		</View>
	);
});

export default SwithTimeTracking;

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 32,
		width: '100%'
	},
	detectWrapper: {
		borderRadius: 8,
		paddingHorizontal: 13,
		paddingVertical: 8
	},
	infoText: {
		color: '#938FA4',
		fontFamily: typography.primary.medium,
		fontSize: 14,
		marginTop: 10
	},
	infoTitle: {
		fontFamily: typography.primary.semiBold,
		fontSize: 16
	},
	toggle: {
		height: 40,
		right: -10,
		top: -10
	},
	wrapperInfo: {
		maxWidth: '90%'
	}
});
