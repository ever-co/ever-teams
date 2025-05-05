/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable camelcase */
import { observer } from 'mobx-react-lite';
import React, { FC } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { secondsToTime } from '../../../../helpers/date';
import { pad } from '../../../../helpers/number';
import { translate } from '../../../../i18n';
import { useTaskStatistics } from '../../../../services/hooks/features/useTaskStatics';
import { I_TeamMemberCardHook } from '../../../../services/hooks/features/useTeamMemberCard';
import { typography } from '../../../../theme/typography';
import { useTheme } from 'react-native-paper';

interface IProps {
	memberInfo: I_TeamMemberCardHook;
	period: 'Daily' | 'Total';
}

export const WorkedOnTask: FC<IProps> = observer(({ memberInfo, period }) => {
	// Get current timer seconds
	const { isAuthUser, memberTask } = memberInfo;

	const { dark, colors } = useTheme();

	// activeTaskDailyStat and activeTaskTotalStat removed from useTaskStatistics call
	const { getTaskStat } = useTaskStatistics();

	const { taskTotalStat, taskDailyStat } = getTaskStat(memberTask);

	if (isAuthUser) {
		// const { h: th, m: tm } = secondsToTime(activeTaskTotalStat?.duration || 0)
		// const { h: dh, m: dm } = secondsToTime(activeTaskDailyStat?.duration || 0)

		const { h: th, m: tm } = secondsToTime(taskTotalStat?.duration || 0);
		const { h: dh, m: dm } = secondsToTime(taskDailyStat?.duration || 0);
		return (
			<>
				{period === 'Daily' ? (
					<View style={styles.container}>
						<Text style={[styles.totalTimeTitle, { color: dark ? '#7B8089' : '#7E7991' }]}>
							{translate('teamScreen.cardTodayWorkLabel')}
						</Text>
						<Text style={[styles.totalTimeText, { color: colors.primary }]}>
							{pad(dh)} h:{pad(dm)} m
						</Text>
					</View>
				) : (
					<View style={styles.container}>
						<Text style={[styles.totalTimeTitle, { color: dark ? '#7B8089' : '#7E7991' }]}>
							{translate('teamScreen.cardTotalWorkLabel')}
						</Text>
						<Text style={[styles.totalTimeText, { color: colors.primary }]}>
							{pad(th)} h:{pad(tm)} m
						</Text>
					</View>
				)}
			</>
		);
	}

	const { h: th, m: tm } = secondsToTime(taskTotalStat?.duration || 0);
	const { h: dh, m: dm } = secondsToTime(taskDailyStat?.duration || 0);
	return (
		<>
			{period === 'Daily' ? (
				<View style={styles.container}>
					<Text style={[styles.totalTimeTitle, { color: dark ? '#7B8089' : '#7E7991' }]}>
						{translate('teamScreen.cardTodayWorkLabel')}
					</Text>
					<Text style={[styles.totalTimeText, { color: colors.primary }]}>
						{pad(dh)} h:{pad(dm)} m
					</Text>
				</View>
			) : (
				<View style={styles.container}>
					<Text style={[styles.totalTimeTitle, { color: dark ? '#7B8089' : '#7E7991' }]}>
						{translate('teamScreen.cardTotalWorkLabel')}
					</Text>
					<Text style={[styles.totalTimeText, { color: colors.primary }]}>
						{pad(th)} h:{pad(tm)} m
					</Text>
				</View>
			)}
		</>
	);
});

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
		height: '80%',
		justifyContent: 'space-between'
	},
	totalTimeText: {
		color: '#282048',
		fontFamily: typography.primary.semiBold,
		fontSize: 12
	},
	totalTimeTitle: {
		color: '#7E7991',
		fontFamily: typography.secondary.medium,
		fontSize: 10
	}
});
