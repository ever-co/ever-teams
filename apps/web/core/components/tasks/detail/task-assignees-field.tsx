'use client';

import { useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { Plus } from '@/core/components/icons';
import { TaskPropertyMenu, type TaskPropertyMenuOption } from '@/core/components/tasks/task-property-menu';
import { PersonAvatar, personFromTaskMember, personFromTeamMember } from '@/core/components/teams/people-avatars';
import { useTaskMemberManagement } from '@/core/hooks/tasks/use-task-member-management';
import { useTaskQueries } from '@/core/hooks/organizations/teams/use-task-queries';
import { isAssignedTo, useActivateOnSelfAssign } from '@/core/hooks/tasks/use-task-self-assignment';
import { activeTeamState } from '@/core/stores';
import type { TOrganizationTeamEmployee } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { DETAIL_MUTED_TEXT } from './task-detail-recipes';

type TaskMember = NonNullable<TTask['members']>[number];

const ADD_BUTTON =
	'flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hairline-border border-dashed border-foreground/25 transition-colors hover:border-foreground/45 hover:text-foreground [&_svg]:size-3.5';

const PERSON_CHIP =
	'inline-flex h-7 max-w-44 min-w-0 items-center gap-1.5 rounded-full bg-foreground/[0.04] pr-2.5 pl-1 text-xs font-medium text-foreground outline-none transition-colors hover:bg-foreground/[0.07] focus-visible:ring-[3px] focus-visible:ring-ring/25';

function firstNameOf(name: string) {
	const words = name.trim().split(/\s+/);
	return words[0] ?? name;
}

function memberOption(member: TOrganizationTeamEmployee): TaskPropertyMenuOption<TOrganizationTeamEmployee> {
	const person = personFromTeamMember(member);
	return {
		key: member.id,
		value: member,
		label: person.name,
		icon: <PersonAvatar person={person} className="size-4 text-[8px] ring-0" />
	};
}

function AssigneeChip({ member }: Readonly<{ member: TaskMember }>) {
	const person = personFromTaskMember(member);
	const profilePath = `/profile/${member.userId}`;
	return (
		<Link href={profilePath} title={person.name} className={PERSON_CHIP}>
			<PersonAvatar person={person} className="size-5 text-[9px] ring-0" />
			<span className="truncate">{firstNameOf(person.name)}</span>
		</Link>
	);
}

export function TaskAssigneesField({ task }: Readonly<{ task: TTask }>) {
	const t = useTranslations();
	const activeTeam = useAtomValue(activeTeamState);
	const teamMembers = useMemo(() => activeTeam?.members ?? [], [activeTeam?.members]);
	const { assignMember, unassignMember } = useTaskMemberManagement(task, teamMembers);
	const { getTaskById } = useTaskQueries();
	const activateOnSelfAssign = useActivateOnSelfAssign(task);
	const assignees = task.members ?? [];
	const hasAssignees = assignees.length > 0;

	const options = useMemo(
		() => teamMembers.filter((member) => member.employee?.isActive).map(memberOption),
		[teamMembers]
	);

	const isSelected = useCallback((member: TOrganizationTeamEmployee) => isAssignedTo(task, member), [task]);

	const toggle = useCallback(
		async (member: TOrganizationTeamEmployee) => {
			const isAssigned = isAssignedTo(task, member);
			try {
				if (isAssigned) {
					await unassignMember(member);
					return;
				}
				await assignMember(member);
				activateOnSelfAssign(member);
			} catch {
				// useTaskMemberManagement already showed the error
				getTaskById(task.id);
			}
		},
		[activateOnSelfAssign, assignMember, getTaskById, task, unassignMember]
	);

	return (
		<>
			{assignees.map((member) => (
				<AssigneeChip key={member.id} member={member} />
			))}
			{!hasAssignees && <span className={DETAIL_MUTED_TEXT}>{t('taskDetail.properties.NO_ASSIGNEE')}</span>}
			<TaskPropertyMenu
				options={options}
				isSelected={isSelected}
				onSelect={toggle}
				multiple={true}
				searchPlaceholder={t('taskDetail.properties.SEARCH_PEOPLE')}
				triggerLabel={t('taskDetail.properties.MANAGE_ASSIGNEES')}
				triggerClassName="rounded-full"
				popupClassName="w-64"
			>
				<span className={ADD_BUTTON}>
					<Plus aria-hidden="true" />
				</span>
			</TaskPropertyMenu>
		</>
	);
}
