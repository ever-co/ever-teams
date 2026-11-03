import { secondsToTime } from '@/core/lib/helpers/index';
import { useTaskStatistics, useMemberIdentity } from '@/core/hooks';
import { activeTaskStatisticsState, timerSecondsState } from '@/core/stores';
import { clsxm } from '@/core/lib/utils';
import { Text } from '@/core/components';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { TTaskStatistics } from '@/core/types/interfaces/task/task';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';

// Shown for the other members: only the authenticated member's total is computed live.
const EMPTY_VALUE = '–';

function sumTodayTasksDuration(member: TOrganizationTeamEmployee | undefined): number {
	const todayTasks: TTaskStatistics[] = member?.totalTodayTasks ?? [];
	return todayTasks.reduce((total, taskStatistic) => total + (taskStatistic.duration || 0), 0);
}

// Only the authenticated member's block subscribes to the per-second timer.
function AuthUserTodayWorked({ member }: Readonly<{ member: TOrganizationTeamEmployee | undefined }>) {
	const seconds = useAtomValue(timerSecondsState);
	const statActiveTask = useAtomValue(activeTaskStatisticsState);
	const activeTaskTotalStat = statActiveTask.total;
	const { addSeconds } = useTaskStatistics(seconds);
	const todayTasksDuration = sumTodayTasksDuration(member);
	const activeTaskDuration = activeTaskTotalStat?.duration || 0;
	const baseDuration = todayTasksDuration || activeTaskDuration;
	const { hours, minutes } = secondsToTime(baseDuration + addSeconds);
	return (
		<>
			{hours}h : {minutes}m
		</>
	);
}

export function BlockCardMemberTodayWorked({ member }: { member: any }) {
	const t = useTranslations();
	const { isAuthUser } = useMemberIdentity(member);

	return (
		<div className={clsxm('flex flex-col items-end justify-center font-normal')}>
			<span className="text-right text-xs capitalize text-muted-foreground">
				{t('common.TOTAL_WORKED_TODAY')}
			</span>
			<Text className="text-sm font-medium tabular-nums">
				{isAuthUser && <AuthUserTodayWorked member={member} />}
				{!isAuthUser && EMPTY_VALUE}
			</Text>
		</div>
	);
}
