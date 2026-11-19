/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable camelcase */
import { observer } from 'mobx-react-lite';
import React, { FC } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { secondsToTime } from '../../../../helpers/date';
import { pad } from '../../../../helpers/number';
import { translate } from '../../../../i18n';
import { useTaskStatistics } from '../../../../services/hooks/features/use-task-statistics';
import { I_TeamMemberCardHook } from '../../../../services/hooks/features/use-team-member-card';
import { typography } from '../../../../theme/typography';
import { useWebTheme } from '../../../../theme';
import { statLabelStyleOf, statValueStyleOf } from './card-stat-text';

interface IProps {
	memberInfo: I_TeamMemberCardHook;
	period: 'Daily' | 'Total';
}

export const WorkedOnTask: FC<IProps> = observer(({ memberInfo, period }) => {
	// Get current timer seconds
	const { isAuthUser, memberTask } = memberInfo;

	const theme = useWebTheme();

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
						<Text style={[styles.totalTimeTitle, statLabelStyleOf(theme)]}>
							{translate('teamScreen.cardTodayWorkLabel')}
						</Text>
						<Text style={[styles.totalTimeText, statValueStyleOf(theme)]}>
							{pad(dh)} h:{pad(dm)} m
						</Text>
					</View>
				) : (
					<View style={styles.container}>
						<Text style={[styles.totalTimeTitle, statLabelStyleOf(theme)]}>
							{translate('teamScreen.cardTotalWorkLabel')}
						</Text>
						<Text style={[styles.totalTimeText, statValueStyleOf(theme)]}>
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
					<Text style={[styles.totalTimeTitle, statLabelStyleOf(theme)]}>
						{translate('teamScreen.cardTodayWorkLabel')}
					</Text>
					<Text style={[styles.totalTimeText, statValueStyleOf(theme)]}>
						{pad(dh)} h:{pad(dm)} m
					</Text>
				</View>
			) : (
				<View style={styles.container}>
					<Text style={[styles.totalTimeTitle, statLabelStyleOf(theme)]}>
						{translate('teamScreen.cardTotalWorkLabel')}
					</Text>
					<Text style={[styles.totalTimeText, statValueStyleOf(theme)]}>
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
