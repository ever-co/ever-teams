/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useOrganizationTeam } from '../../../../services/hooks/useOrganization';
// import { translate } from '../../../../i18n';
import { limitTextCharaters } from '../../../../helpers/sub-text';
import { Toggle } from '../../../../components/Toggle';
import { typography, useAppTheme } from '../../../../theme';

interface Props {}
const SwitchTeamPublicity: FC<Props> = observer(() => {
	const { colors } = useAppTheme();
	const { onUpdateOrganizationTeam, currentTeam, activeTeam } = useOrganizationTeam();

	const [isTeamPublic, setIsTeamPublic] = useState<boolean>(activeTeam?.public);

	const toggleSwitch = useCallback(async () => {
		await onUpdateOrganizationTeam({
			id: currentTeam?.id,
			data: { ...currentTeam, public: !isTeamPublic }
		}).then(() => setIsTeamPublic((prev) => !prev));
	}, [isTeamPublic, currentTeam]);

	useEffect(() => {
		setIsTeamPublic(activeTeam?.public);
	}, [currentTeam]);
	return (
		<View style={styles.container}>
			<View style={styles.wrapperInfo}>
				<Text style={[styles.infoTitle, { color: colors.primary }]}>Team Type</Text>
				<Text style={[styles.infoText, { color: colors.tertiary }]}>
					{limitTextCharaters({
						text: isTeamPublic ? 'Public Team' : 'Private Team',
						numChars: 77
					})}
				</Text>
			</View>
			<Toggle
				inputInnerStyle={{ backgroundColor: '#DBD3FA' }}
				inputDetailStyle={{ backgroundColor: '#3826A6' }}
				onPress={() => toggleSwitch()}
				variant="switch"
				value={isTeamPublic}
			/>
		</View>
	);
});

export default SwitchTeamPublicity;

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
