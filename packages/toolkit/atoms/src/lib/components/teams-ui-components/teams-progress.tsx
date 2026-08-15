import { ITeamsProgressProps } from '@ever-teams/toolkit-types';
import { cn } from '@ever-teams/toolkit-ui';
import { Progress } from '@ever-teams/toolkit-ui';

const TeamsProgress = ({ className, todayTrackedTime }: ITeamsProgressProps) => {
	const dailyPickHours = 8 * 60 * 60; // 8 hours in seconds

	return <Progress className={cn(className)} value={(todayTrackedTime?.totalSeconds! * 100) / dailyPickHours} />;
};

TeamsProgress.displaName = 'teamsProgress';

export { TeamsProgress };
