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
import { TaskTimes } from '../../../../../tasks/task-times';
import get from 'lodash/get';
import { useAtomValue } from 'jotai';
import { fullWidthState } from '@/core/stores/common/full-width';
import { TaskInfo } from '../user-team-card/task-info';
import { UserInfo } from '../user-team-card/user-info';
import { TaskEstimateInfo } from '../user-team-card/task-estimate';
import { UserTeamCardMenu } from '../user-team-card/user-team-card-menu';
import { InputField } from '@/core/components/duplicated-components/_input';
import { createContext, useContext, useMemo, memo } from 'react';
import { TTask } from '@/core/types/schemas/task/task.schema';

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
	const fullWidth = useAtomValue(fullWidthState);

	return (
		<TaskInfo
			edition={taskEdition}
			className={clsxm(
				'flex flex-1 justify-center items-center px-2',
				fullWidth ? 'max-w-[24rem]' : 'max-w-[20rem]'
			)}
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
			className={clsxm('flex flex-col justify-center items-center mx-auto')}
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
	const { identity, memberTask, mutations, roleActions, taskEdition } = useTeamMemberRowContext();
	const active = get(cell, 'column.columnDef.meta.active', false);

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
					className={clsxm(
						'mr-1 w-4 h-4 border-none accent-primary-light',
						'border-2 border-primary-light',
						'w-1/5 2xl:w-[2rem]'
					)}
					noWrapper={true}
					onChange={onUserSelect}
				/>
			)}
		</>
	);
}
