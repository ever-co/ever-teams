'use client';

import { DropdownMenuCheckboxItem } from '@/core/components/common/dropdown-menu';
import { PersonAvatar, personFromTeamMember } from '@/core/components/teams/people-avatars';
import { useTeamMemberMutations } from '@/core/hooks';
import type { TOrganizationTeamEmployee } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';

export function isTaskAssignee(task: TTask, member: TOrganizationTeamEmployee | undefined) {
	if (!member) {
		return false;
	}
	const memberUserId = member.employee?.userId;
	return (task.members ?? []).some((assignee) => {
		const sameEmployee = assignee.id === member.employeeId;
		const sameUser = Boolean(memberUserId) && assignee.userId === memberUserId;
		return sameEmployee || sameUser;
	});
}

/** One member row of the Assignee submenu, with its own mutation hook: it exists only while the submenu is open. */
export function TaskAssigneeMenuItem({ task, member }: Readonly<{ task: TTask; member: TOrganizationTeamEmployee }>) {
	const { assignTask, unassignTask } = useTeamMemberMutations(member);
	const isAssigned = isTaskAssignee(task, member);
	const person = personFromTeamMember(member);

	const toggle = () => {
		if (isAssigned) {
			unassignTask(task);
			return;
		}
		assignTask(task);
	};

	return (
		<DropdownMenuCheckboxItem checked={isAssigned} closeOnClick={false} onClick={toggle}>
			<PersonAvatar person={person} className="size-5 text-[9px] ring-0" />
			<span className="min-w-0 flex-1 truncate">{person.name}</span>
		</DropdownMenuCheckboxItem>
	);
}
