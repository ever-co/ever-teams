'use client';

import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useAuthenticateUser } from '@/core/hooks/auth';
import { useOrganizationAndTeamManagers } from '@/core/hooks/organizations/teams/use-organization-teams-managers';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import { isProject } from '@/core/lib/helpers/type-guards';
import type { TimeActivityFilterField } from '@/core/lib/utils/dashboards/time-activity';
import { activeTeamState, tasksByTeamState } from '@/core/stores';
import type { TOrganizationProject, TOrganizationTeam, TUser } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';

export interface TimeActivityFilterOption {
	value: string;
	name: string;
	/** The task number, written before the title. */
	prefix?: string;
	imageUrl?: string | null;
	color?: string | null;
}

export type TimeActivityFilterOptions = Record<TimeActivityFilterField, TimeActivityFilterOption[]>;

type TeamMember = NonNullable<TOrganizationTeam['members']>[number];

function byName(first: TimeActivityFilterOption, second: TimeActivityFilterOption) {
	return first.name.localeCompare(second.name);
}

function teamOptionOf(team: TOrganizationTeam): TimeActivityFilterOption {
	return { value: team.id, name: team.name, imageUrl: team.image?.thumbUrl, color: team.color };
}

function memberOptionOf(member: TeamMember): TimeActivityFilterOption | null {
	const employee = member?.employee;
	const employeeId = employee?.id;
	if (!employeeId) {
		return null;
	}
	const fullName = employee?.fullName?.trim();
	const userName = employee?.user?.name?.trim() ?? '';
	const name = fullName || userName;
	return { value: employeeId, name, imageUrl: employee?.user?.imageUrl };
}

function isOwnMember(member: TeamMember, userId: string | undefined) {
	return member?.employee?.userId === userId;
}

/** A team manager picks among every member of the active team; anyone else only finds themself. */
function visibleMembersOf(members: TeamMember[], canSeeEveryone: boolean, userId: string | undefined) {
	if (canSeeEveryone) {
		return members;
	}
	return members.filter((member) => isOwnMember(member, userId));
}

function hasProjectIdentity(project: TOrganizationProject) {
	const hasName = Boolean(project.name?.trim());
	const hasStatus = Boolean(project.status);
	return hasName && hasStatus;
}

function isProjectMember(project: TOrganizationProject, userId: string) {
	const members = project.members ?? [];
	return members.some((member) => member?.employee?.userId === userId);
}

function hasOwnTaskIn(project: TOrganizationProject, userId: string) {
	const tasks = project.tasks ?? [];
	return tasks.some((task) => {
		const taskMembers: Array<{ userId?: string; employee?: { userId?: string } }> = task?.members ?? [];
		return taskMembers.some((member) => {
			const isEmployeeUser = member?.employee?.userId === userId;
			const isUser = member?.userId === userId;
			return isEmployeeUser || isUser;
		});
	});
}

/** The previous filter's rule: managers see every project; others public ones, theirs, or those holding their tasks. */
function isVisibleProject(project: TOrganizationProject, canSeeEveryone: boolean, user: TUser | null | undefined) {
	const isRealProject = isProject(project);
	if (!isRealProject) {
		return false;
	}
	if (!hasProjectIdentity(project)) {
		return false;
	}
	if (canSeeEveryone) {
		return true;
	}
	if (!user) {
		return false;
	}
	const isPublic = project.public === true;
	const isMember = isProjectMember(project, user.id);
	const hasOwnTask = hasOwnTaskIn(project, user.id);
	return isPublic || isMember || hasOwnTask;
}

function projectOptionOf(project: TOrganizationProject): TimeActivityFilterOption {
	return { value: project.id, name: project.name, imageUrl: project.imageUrl, color: project.color };
}

function isOwnTask(task: TTask, userId: string | undefined) {
	const members = task.members ?? [];
	return members.some((member) => member?.userId === userId);
}

function visibleTasksOf(tasks: TTask[], canSeeEveryone: boolean, userId: string | undefined) {
	if (canSeeEveryone) {
		return tasks;
	}
	return tasks.filter((task) => isOwnTask(task, userId));
}

function taskPrefixOf(task: TTask) {
	const number = task.number ?? task.taskNumber;
	const label = String(number ?? '');
	if (!label) {
		return undefined;
	}
	return `#${label}`;
}

function taskOptionOf(task: TTask): TimeActivityFilterOption {
	return { value: task.id, name: task.title ?? '', prefix: taskPrefixOf(task) };
}

function compact<T>(items: Array<T | null>): T[] {
	const kept: T[] = [];
	for (const item of items) {
		if (item !== null) {
			kept.push(item);
		}
	}
	return kept;
}

export function useTimeActivityFilterOptions(): TimeActivityFilterOptions {
	const { user, isTeamManager } = useAuthenticateUser();
	const { userManagedTeams } = useOrganizationAndTeamManagers();
	const { organizationProjects } = useOrganizationProjectsQuery();
	const activeTeam = useAtomValue(activeTeamState);
	const teamTasks = useAtomValue(tasksByTeamState);
	const canSeeEveryone = Boolean(isTeamManager);
	const userId = user?.id;

	return useMemo(() => {
		const teamOptions = userManagedTeams.map(teamOptionOf);
		teamOptions.sort(byName);
		const teamMembers = activeTeam?.members ?? [];
		const members = visibleMembersOf(teamMembers, canSeeEveryone, userId);
		const memberCandidates = members.map(memberOptionOf);
		const memberOptions = compact(memberCandidates);
		memberOptions.sort(byName);
		const projects = organizationProjects.filter((project) => isVisibleProject(project, canSeeEveryone, user));
		const projectOptions = projects.map(projectOptionOf);
		projectOptions.sort(byName);
		const tasks = visibleTasksOf(teamTasks, canSeeEveryone, userId);
		const taskOptions = tasks.map(taskOptionOf);
		return {
			teamIds: teamOptions,
			employeeIds: memberOptions,
			projectIds: projectOptions,
			taskIds: taskOptions
		};
	}, [activeTeam?.members, canSeeEveryone, organizationProjects, teamTasks, user, userId, userManagedTeams]);
}
