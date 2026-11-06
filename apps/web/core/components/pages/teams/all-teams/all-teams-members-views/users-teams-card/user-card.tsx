import { clsxm } from '@/core/lib/utils';
import { Transition } from '@headlessui/react';
import { DragHandle } from '@/core/components/icons';
import MemberInfo from './member-infos';
import UserTeamActiveTaskInfo from './user-team-active-task';
import UserTeamActiveTaskTimes from './user-team-active-task-times';
import UserTeamActiveTaskEstimate from './user-team-task-estimate';
import UserTeamActiveTaskTodayWorked from './user-team-today-worked';
import {
	useMemberIdentity,
	useMemberActiveTask,
	useTeamMemberMutations,
	useTeamMemberRoleActions,
	useTaskQueries,
	useTMCardTaskEdit
} from '@/core/hooks';
import { useEffect, useState } from 'react';
import { UserTeamCardMenu } from '../../../team/team-members-views/user-team-card/user-team-card-menu';
import {
	MEMBER_CARD_PADDING,
	MEMBER_CELL,
	MEMBER_CELL_CENTER,
	MEMBER_FIRST_CELL,
	MEMBER_MENU_CELL,
	MEMBER_ROW_GRID
} from '@/core/components/teams/member-row-grid';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';

/** One member row of a team group, on the same grid as the team page rows and their column header. */
export default function UserTeamCard({
	member,
	className = 'max-w-full'
}: Readonly<{ member: TOrganizationTeamEmployee; className?: string }>) {
	return (
		<Transition
			as="div"
			show={true}
			enter="transition-opacity duration-75 w-full"
			enterFrom="opacity-0"
			enterTo="opacity-100"
			leave="transition-opacity duration-150"
			leaveFrom="opacity-100"
			leaveTo="opacity-0"
		>
			<div className={clsxm('group/row relative hidden w-full py-2 sm:block', MEMBER_CARD_PADDING, className)}>
				<div className={clsxm(MEMBER_ROW_GRID, 'relative min-h-12')}>
					<div className="absolute -left-3.5 top-1/2 -translate-y-1/2 cursor-grab text-muted-foreground/60 opacity-0 transition-opacity group-focus-within/row:opacity-100 group-hover/row:opacity-100">
						<DragHandle className="size-3.5" />
					</div>

					{/* User information */}
					<div className={MEMBER_FIRST_CELL}>
						<MemberInfo member={member} className="w-full pr-2" />
					</div>

					{/* Task information */}
					<div className={MEMBER_CELL}>
						<UserTeamActiveTaskInfo member={member} className="w-full min-w-0 flex-1 overflow-y-hidden" />
					</div>

					{/* Task worked Times */}
					<div className={clsxm(MEMBER_CELL, MEMBER_CELL_CENTER)}>
						<UserTeamActiveTaskTimes
							member={member}
							className="flex min-w-0 flex-col items-end justify-center gap-y-1 tabular-nums"
						/>
					</div>

					{/* Task estimate Info */}
					<div className={clsxm(MEMBER_CELL, MEMBER_CELL_CENTER)}>
						<UserTeamActiveTaskEstimate member={member} className="w-full max-w-52 min-w-0" />
					</div>

					<div className={clsxm(MEMBER_CELL, MEMBER_CELL_CENTER)}>
						<UserTeamActiveTaskTodayWorked
							member={member}
							className="flex min-w-0 items-center justify-end"
						/>
					</div>

					{/* Row menu */}
					<div className={MEMBER_MENU_CELL}>
						<UserActiveTaskMenu member={member} />
					</div>
				</div>
			</div>
		</Transition>
	);
}

function UserActiveTaskMenu({ member }: { member: TOrganizationTeamEmployee }) {
	// Granular hooks — "pay only for what you use"
	const identity = useMemberIdentity(member);
	const memberTask = useMemberActiveTask(member);
	const mutations = useTeamMemberMutations(member);
	const roleActions = useTeamMemberRoleActions(member);

	const [activeTask, setActiveTask] = useState<TTask | null | undefined>(null);
	const taskEdition = useTMCardTaskEdit(activeTask);

	const { getTaskById } = useTaskQueries();

	useEffect(() => {
		if (!member.activeTaskId) {
			return;
		}
		getTaskById(member.activeTaskId)
			.then((response) => setActiveTask(response as TTask))
			.catch((_) => console.log(_));

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
	return (
		<>
			<UserTeamCardMenu
				identity={identity}
				memberTask={memberTask}
				mutations={mutations}
				roleActions={roleActions}
				edition={taskEdition}
			/>
		</>
	);
}
