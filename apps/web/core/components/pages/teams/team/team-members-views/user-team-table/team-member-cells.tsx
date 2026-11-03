import {
	useTMCardTaskEdit,
	useCollaborative,
	useMemberIdentity,
	useMemberActiveTask,
	useTeamMemberMutations,
	useTeamMemberRoleActions,
	I_MemberIdentityHook,
	I_TeamMemberMutationsHook,
	I_TeamMemberRoleActionsHook,
	I_TMCardTaskEditHook
} from '@/core/hooks';
import { clsxm } from '@/core/lib/utils';
import { TaskTimes, TodayWorkedTime } from '../../../../../tasks/task-times';
import get from 'lodash/get';
import { TaskInfo } from '../user-team-card/task-info';
import { UserInfo } from '../user-team-card/user-info';
import { TaskEstimateInfo } from '../user-team-card/task-estimate';
import { UserTeamCardMenu } from '../user-team-card/user-team-card-menu';
import { InputField } from '@/core/components/duplicated-components/_input';
import { createContext, useContext, useMemo, memo } from 'react';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useAtomValue } from 'jotai';
import { cn } from '@/core/lib/helpers';
import { teamTasksPagesLoadingState } from '@/core/stores/teams/team-tasks';
import {
	MEMBER_CARD_PADDING,
	MEMBER_CELL,
	MEMBER_CELL_CENTER,
	MEMBER_FIRST_CELL,
	MEMBER_MENU_CELL,
	MEMBER_ROW_GRID,
	MEMBER_ROW_MIN_HEIGHT
} from '@/core/components/teams/member-row-grid';
import {
	MemberEstimateCellSkeleton,
	MemberTaskCellSkeleton,
	MemberTimesCellSkeleton,
	MemberTotalCellSkeleton
} from '@/core/components/teams/member-row-skeleton';

/**
 * Context to share granular hook results and taskEdition state across all cells in a table row.
 * This fixes the bug where ActionMenuCell and TaskCell had separate taskEdition instances,
 * causing "Edit Task" in the menu to not trigger edit mode in the TaskCell.
 */
interface TeamMemberRowContextValue {
	identity: I_MemberIdentityHook;
	memberTask: TTask | null;
	mutations: I_TeamMemberMutationsHook;
	roleActions: I_TeamMemberRoleActionsHook;
	taskEdition: I_TMCardTaskEditHook;
}

const TeamMemberRowContext = createContext<TeamMemberRowContextValue | null>(null);

/**
 * Hook to access the shared row context.
 * Throws if used outside of TeamMemberRowProvider.
 */
function useTeamMemberRowContext(): TeamMemberRowContextValue {
	const context = useContext(TeamMemberRowContext);
	if (!context) {
		throw new Error('useTeamMemberRowContext must be used within TeamMemberRowProvider');
	}
	return context;
}

/**
 * Provider component that wraps a table row and shares granular hooks/taskEdition.
 * This ensures all cells in the same row use the same hook instances.
 */
const TeamMemberRowProviderInternal = memo(({ member, children }: { member: any; children: React.ReactNode }) => {
	// Granular hooks — "pay only for what you use"
	const identity = useMemberIdentity(member);
	const memberTask = useMemberActiveTask(member);
	const mutations = useTeamMemberMutations(member);
	const roleActions = useTeamMemberRoleActions(member);
	const taskEdition = useTMCardTaskEdit(memberTask);

	const value = useMemo(
		() => ({ identity, memberTask, mutations, roleActions, taskEdition }),
		[identity, memberTask, mutations, roleActions, taskEdition]
	);

	return <TeamMemberRowContext.Provider value={value}>{children}</TeamMemberRowContext.Provider>;
});

TeamMemberRowProviderInternal.displayName = 'TeamMemberRowProviderInternal';

/**
 * Wrapper component compatible with DataTable's rowWrapper prop.
 * Receives `data` from DataTable and passes it as `member` to the internal provider.
 */
export function TeamMemberRowWrapper({ data, children }: { data: any; children: React.ReactNode }) {
	return <TeamMemberRowProviderInternal member={data}>{children}</TeamMemberRowProviderInternal>;
}

export function TaskCell() {
	const { taskEdition } = useTeamMemberRowContext();
	const publicTeam = false;

	return (
		<TaskInfo
			edition={taskEdition}
			className={clsxm('flex flex-1 justify-center items-center px-2', 'max-w-[24rem]')}
			publicTeam={publicTeam}
		/>
	);
}

export function UserInfoCell({ cell }: Readonly<{ cell: any }>) {
	const row = get(cell, 'row', {});
	const member = row.original as any;
	const publicTeam = get(cell, 'column.columnDef.meta.publicTeam', false);
	const memberInfo = useMemberIdentity(member);

	return <UserInfo memberInfo={memberInfo} className="w-fit" publicTeam={publicTeam} />;
}

export function WorkedOnTaskCell() {
	const { identity, memberTask } = useTeamMemberRowContext();

	return (
		<TaskTimes
			activeAuthTask={true}
			memberInfo={identity}
			task={memberTask}
			isAuthUser={identity.isAuthUser}
			className={clsxm('mx-auto flex flex-col items-center justify-center gap-y-1 tabular-nums')}
		/>
	);
}

export function TaskEstimateInfoCell() {
	const { identity, memberTask, taskEdition } = useTeamMemberRowContext();

	// Lightweight memberInfo — TaskEstimateInfo only needs memberTask, isAuthUser, isAuthTeamManager
	const memberInfo = useMemo(
		() => ({ memberTask, isAuthUser: identity.isAuthUser, isAuthTeamManager: identity.isAuthTeamManager }),
		[memberTask, identity.isAuthUser, identity.isAuthTeamManager]
	);

	return (
		<TaskEstimateInfo
			memberInfo={memberInfo}
			edition={taskEdition}
			activeAuthTask={true}
			className={clsxm('flex flex-col justify-center items-center')}
			useActiveTeamTaskByDefault={false}
			allowEmptyTask={false}
		/>
	);
}

export function ActionMenuCell({ cell }: { cell: any }) {
	const active = get(cell, 'column.columnDef.meta.active', false);
	return <ActionMenu active={active} />;
}

export function ActionMenu({ active }: Readonly<{ active: boolean }>) {
	const { identity, memberTask, mutations, roleActions, taskEdition } = useTeamMemberRowContext();

	const { collaborativeSelect, user_selected, onUserSelect } = useCollaborative(identity.memberUser);

	return (
		<>
			{(!collaborativeSelect || active) && (
				<UserTeamCardMenu
					identity={identity}
					memberTask={memberTask}
					mutations={mutations}
					roleActions={roleActions}
					edition={taskEdition}
				/>
			)}

			{collaborativeSelect && !active && (
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
}

interface TeamMemberTableRowProps {
	publicTeam: boolean;
	active: boolean;
	statsPending: boolean;
}

/**
 * One member of the table view on the member grid of the cards view, so the columns and their labels stay in place
 * when switching between the two views. Cells whose data is still loading show their skeleton.
 */
export function TeamMemberTableRow({ publicTeam, active, statsPending }: Readonly<TeamMemberTableRowProps>) {
	const { identity, memberTask, taskEdition } = useTeamMemberRowContext();
	const tasksPagesLoading = useAtomValue(teamTasksPagesLoadingState);
	const isTaskListPending = !memberTask && tasksPagesLoading;
	const isTaskPending = isTaskListPending || statsPending;
	const isTimesPending = isTaskPending || statsPending;

	const memberInfo = useMemo(
		() => ({ memberTask, isAuthUser: identity.isAuthUser, isAuthTeamManager: identity.isAuthTeamManager }),
		[memberTask, identity.isAuthUser, identity.isAuthTeamManager]
	);

	return (
		<div className={cn(MEMBER_CARD_PADDING, 'py-2')}>
			<div className={cn(MEMBER_ROW_GRID, MEMBER_ROW_MIN_HEIGHT)}>
				<div className={MEMBER_FIRST_CELL}>
					<UserInfo memberInfo={identity} className="w-full" publicTeam={publicTeam} />
				</div>

				<div className={cn(MEMBER_CELL, 'justify-between gap-1')}>
					{isTaskPending && <MemberTaskCellSkeleton />}
					{!isTaskPending && (
						<TaskInfo
							edition={taskEdition}
							className="w-full min-w-0 flex-1 overflow-y-hidden"
							publicTeam={publicTeam}
							tab="default"
						/>
					)}
				</div>

				<div className={cn(MEMBER_CELL, MEMBER_CELL_CENTER)}>
					{isTimesPending && <MemberTimesCellSkeleton />}
					{!isTimesPending && (
						<TaskTimes
							activeAuthTask={true}
							memberInfo={identity}
							task={memberTask}
							isAuthUser={identity.isAuthUser}
							className="flex flex-col gap-1"
						/>
					)}
				</div>

				<div className={cn(MEMBER_CELL, MEMBER_CELL_CENTER)}>
					{isTaskPending && <MemberEstimateCellSkeleton />}
					{!isTaskPending && (
						<TaskEstimateInfo
							memberInfo={memberInfo}
							edition={taskEdition}
							activeAuthTask={true}
							className="w-full max-w-52 min-w-0"
							useActiveTeamTaskByDefault={false}
							allowEmptyTask={false}
						/>
					)}
				</div>

				<div className={cn(MEMBER_CELL, MEMBER_CELL_CENTER)}>
					{statsPending && <MemberTotalCellSkeleton />}
					{!statsPending && (
						<TodayWorkedTime
							isAuthUser={identity.isAuthUser}
							className="text-sm font-medium tabular-nums"
							memberInfo={identity}
						/>
					)}
				</div>

				<div className={MEMBER_MENU_CELL}>
					<ActionMenu active={active} />
				</div>
			</div>
		</div>
	);
}
