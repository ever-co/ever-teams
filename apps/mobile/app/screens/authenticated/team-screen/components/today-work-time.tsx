/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable camelcase */
import { observer } from 'mobx-react-lite';
import React, { FC } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { pad } from '../../../../helpers/number';
import { translate } from '../../../../i18n';
import { I_TeamMemberCardHook } from '../../../../services/hooks/features/useTeamMemberCard';
import { typography } from '../../../../theme/typography';
import { useLiveTimerStatus } from '../../../../services/hooks/useTimer';
import { useTheme } from 'react-native-paper';

interface IProps {
	isAuthUser: boolean;
	memberInfo: I_TeamMemberCardHook;
}

export const TodayWorkedTime: FC<IProps> = observer(({ isAuthUser }) => {
	const {
		time: { m, h }
	} = useLiveTimerStatus();

	const { dark, colors } = useTheme();

	if (isAuthUser) {
		return (
			<View style={styles.container}>
				<Text style={[styles.totalTimeTitle, { color: dark ? '#7B8089' : '#7E7991' }]}>
					{translate('teamScreen.cardTotalTimeLabel')}
				</Text>
				<Text style={[styles.totalTimeText, { color: colors.primary }]}>
					{pad(h)} h:{pad(m)} m
				</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<Text style={[styles.totalTimeTitle, { color: dark ? '#7B8089' : '#7E7991' }]}>
				{translate('teamScreen.cardTotalTimeLabel')}
			</Text>
			<Text style={[styles.totalTimeText, { color: colors.primary }]}>
				{pad(0)} h:{pad(0)} m
			</Text>
		</View>
	);
});

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
		height: '80%',
		justifyContent: 'space-between'
	},
	totalTimeText: {
		fontFamily: typography.primary.semiBold,
		fontSize: 12
	},
	totalTimeTitle: {
		color: '#7E7991',
		fontFamily: typography.secondary.medium,
		fontSize: 10
	}
});
