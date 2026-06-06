/** @jsxImportSource theme-ui */

import { TimeValues } from '@ever-teams/toolkit-types';
import { useTeamsContext } from '../../context/teams-context';
import { ProgressCircle, ProgressCircleProps } from './circle';

export interface TeamsProgressCircleProps extends Omit<ProgressCircleProps, 'value'> {
	todayTrackedTime?: TimeValues;
}

export function TeamsProgressCircle({ todayTrackedTime, ...rest }: TeamsProgressCircleProps) {
	const { appliedTheme } = useTeamsContext();

	// Calculate percentage based on 8-hour daily goal (28,800 seconds)
	const dailyGoalSeconds = 8 * 60 * 60;
	const totalSeconds = todayTrackedTime?.totalSeconds ?? 0;
	const value = Math.floor((totalSeconds * 100) / dailyGoalSeconds);

	return <ProgressCircle value={value} color={appliedTheme.colors?.mainColor as string} {...rest} />;
}
