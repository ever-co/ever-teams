import React, { useMemo } from 'react';
import { secondsToTime } from '@/core/lib/helpers/index';
import {
	useCollaborative,
	useTMCardTaskEdit,
	useTaskStatistics,
	useMemberIdentity,
	useMemberActiveTask,
	useTeamMemberMutations,
	useTeamMemberRoleActions
} from '@/core/hooks';
import { activeTaskStatisticsState, timerSecondsState, timerStatusState } from '@/core/stores';
import { clsxm } from '@/core/lib/utils';
import { Text } from '@/core/components';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { TaskBlockInfo } from './task-info';
import { UserBoxInfo } from './user-info';
import { MemberStatusChip } from './member-status-chip';
import { UserTeamCardMenu } from '../user-team-card/user-team-card-menu';
import { TaskEstimateInfo } from '../user-team-card/task-estimate';
import { TaskTimes } from '@/core/components/tasks/task-times';
import { getTimerStatusValue } from '@/core/components/timer/timer-status';
import { InputField } from '@/core/components/duplicated-components/_input';
import { IOrganizationTeam } from '@/core/types/interfaces/team/organization-team';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { ETimerStatus } from '@/core/types/generics/enums/timer';
import { TTaskStatistics } from '@/core/types/interfaces/task/task';

type IUserTeamBlock = {
	active?: boolean;
	member?: any;
	publicTeam?: boolean;
	members?: IOrganizationTeam['members'];
} & IClassName;

const BLOCK_SURFACE_CLASS_NAME =
	'flex flex-col overflow-hidden rounded-xl bg-card text-card-foreground hairline-ring ring-border shadow-sm shadow-black/6.5';

const TIMES_CELL_CLASS_NAME = 'flex min-w-0 items-center justify-center px-2 py-3';

// Shown for the other members: only the authenticated member's total is computed live.
const EMPTY_VALUE = '–';

function sumTodayTasksDuration(member: IUserTeamBlock['member']): number {
	const todayTasks: TTaskStatistics[] = member?.totalTodayTasks ?? [];
	return todayTasks.reduce((total, taskStatistic) => total + (taskStatistic.duration || 0), 0);
}

// Only the authenticated member's block subscribes to the per-second timer, as the card view does.
function AuthUserTodayWorked({ member }: Readonly<{ member: IUserTeamBlock['member'] }>) {
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

export const UserTeamBlock = React.memo(function UserTeamBlock({
	className,
	active,
	member,
	publicTeam = false
}: IUserTeamBlock) {
	const t = useTranslations();

	// Granular hooks — "pay only for what you use"
	const identity = useMemberIdentity(member);
	const memberTask = useMemberActiveTask(member);
	const mutations = useTeamMemberMutations(member);
	const roleActions = useTeamMemberRoleActions(member);

	// Lightweight composition — only what TaskEstimateInfo actually consumes
	const memberInfo = useMemo(
		() => ({ memberTask, isAuthUser: identity.isAuthUser, isAuthTeamManager: identity.isAuthTeamManager }),
		[memberTask, identity.isAuthUser, identity.isAuthTeamManager]
	);

	const taskEdition = useTMCardTaskEdit(memberTask);

	const { collaborativeSelect, user_selected, onUserSelect } = useCollaborative(identity.memberUser);

	const timerStatus = useAtomValue(timerStatusState);

	const timerStatusValue: ETimerStatus = React.useMemo(() => {
		return getTimerStatusValue(timerStatus, member, publicTeam);
	}, [timerStatus, member, publicTeam]);

	const showsMenu = !collaborativeSelect || active;
	const showsCollaborativeCheckbox = collaborativeSelect && !active;

	const totalWork = (
		<div className="flex flex-col items-end justify-center font-normal">
			<span className="text-right text-xs capitalize text-muted-foreground">
				{t('common.TOTAL_WORKED_TODAY')}
			</span>
			<Text className="text-sm font-medium tabular-nums">
				{identity.isAuthUser && <AuthUserTodayWorked member={member} />}
				{!identity.isAuthUser && EMPTY_VALUE}
			</Text>
		</div>
	);

	const menu = (
		<>
			{showsMenu && (
				<UserTeamCardMenu
					identity={identity}
					memberTask={memberTask}
					mutations={mutations}
					roleActions={roleActions}
					edition={taskEdition}
				/>
			)}

			{showsCollaborativeCheckbox && (
				<InputField
					type="checkbox"
					checked={user_selected()}
					className={clsxm('mr-1 w-4 h-4 border-none accent-primary-light', 'border-2 border-primary-light')}
					noWrapper={true}
					onChange={onUserSelect}
				/>
			)}
		</>
	);

	return (
		<div className={clsxm(BLOCK_SURFACE_CLASS_NAME, className)}>
			{/* Member: avatar, name, live status, today's total and the menu */}
			<div className="flex items-center justify-between gap-3 px-4 py-3">
				<div className="flex min-w-0 flex-1 items-center gap-2">
					<UserBoxInfo memberInfo={identity} className="min-w-0" publicTeam={publicTeam} />
					<MemberStatusChip status={timerStatusValue} />
				</div>
				<div className="flex shrink-0 items-center gap-2">
					{totalWork}
					<div className="w-8 shrink-0">{menu}</div>
				</div>
			</div>

			{/* Task information */}
			<TaskBlockInfo
				edition={taskEdition}
				className="w-full overflow-hidden hairline-t border-dashed border-border px-4 py-3"
				publicTeam={publicTeam}
			/>

			{/* Times strip: today on the task, total on the task, estimate */}
			<div className="grid grid-cols-3 hairline-divide-x divide-dashed divide-border hairline-t border-dashed border-border">
				<div className={TIMES_CELL_CLASS_NAME}>
					<TaskTimes
						activeAuthTask={true}
						memberInfo={identity}
						task={memberTask}
						isAuthUser={identity.isAuthUser}
						className="flex min-w-0 justify-center tabular-nums"
						showTotal={false}
						isBlock={true}
					/>
				</div>
				<div className={TIMES_CELL_CLASS_NAME}>
					<TaskTimes
						activeAuthTask={true}
						memberInfo={identity}
						task={memberTask}
						isAuthUser={identity.isAuthUser}
						className="flex min-w-0 justify-center tabular-nums"
						showDaily={false}
						isBlock={true}
					/>
				</div>
				<div className={TIMES_CELL_CLASS_NAME}>
					<TaskEstimateInfo
						memberInfo={memberInfo}
						edition={taskEdition}
						activeAuthTask={true}
						showTime={false}
						className="min-w-0"
						radial={true}
						useActiveTeamTaskByDefault={false}
						allowEmptyTask={false}
					/>
				</div>
			</div>
		</div>
	);
});
