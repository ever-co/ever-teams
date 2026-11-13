import { employeeIdOf, memberEmailOf, memberNameOf } from '@/core/lib/utils/settings-team';
import type { TimeImportMember, TimeImportProject, TimeImportTask } from '@/core/lib/utils/time-import-rows';
import type { TOrganizationTeam, TOrganizationTeamEmployee } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';

type TimeImportRefusal = 'manualTimeOff' | 'noPermission';

type ImportedTeam = Pick<TOrganizationTeam, 'members' | 'projects'>;

type ImportedTask = Pick<TTask, 'id' | 'title' | 'projectId' | 'members' | 'teams'>;

/**
 * Importing time follows adding manual time: the organization's `allowManualTime`, then the viewer's
 * `ALLOW_MANUAL_TIME` permission. The organization's switch is named first, since no role gets past it.
 */
export function timeImportRefusalOf(
	allowsManualTime: boolean,
	hasManualTimePermission: boolean
): TimeImportRefusal | null {
	if (!allowsManualTime) {
		return 'manualTimeOff';
	}
	if (!hasManualTimePermission) {
		return 'noPermission';
	}
	return null;
}

function importMemberOf(member: TOrganizationTeamEmployee): TimeImportMember | null {
	const employeeId = employeeIdOf(member);
	const email = memberEmailOf(member);
	if (!employeeId || !email) {
		return null;
	}
	return { employeeId, email, name: memberNameOf(member) };
}

/** The members of the team a file may name by email: those the team lists with an employee and an email. */
export function timeImportMembersOf(team: ImportedTeam | null): TimeImportMember[] {
	const teamMembers = team?.members ?? [];
	const members: TimeImportMember[] = [];
	for (const teamMember of teamMembers) {
		const member = importMemberOf(teamMember);
		if (member) {
			members.push(member);
		}
	}
	return members;
}

export function timeImportProjectsOf(team: ImportedTeam | null): TimeImportProject[] {
	const teamProjects = team?.projects ?? [];
	const namedProjects = teamProjects.filter((project) => Boolean(project.id) && Boolean(project.name));
	return namedProjects.map((project) => ({ id: project.id, name: project.name }));
}

function isTaskOfTeam(task: ImportedTask, teamId: string): boolean {
	const taskTeams = task.teams ?? [];
	return taskTeams.some((taskTeam) => taskTeam?.id === teamId);
}

function importTaskOf(task: ImportedTask): TimeImportTask {
	const assignees = task.members ?? [];
	return {
		id: task.id,
		title: task.title,
		projectId: task.projectId ?? null,
		assigneeEmployeeIds: assignees.map((assignee) => assignee.id)
	};
}

/** The tasks of the team the time is saved with, as the Add time dialog lists them: never a task of another team. */
export function timeImportTasksOf(tasks: ReadonlyArray<ImportedTask>, teamId: string | null | undefined) {
	if (!teamId) {
		return [];
	}
	const teamTasks = tasks.filter((task) => isTaskOfTeam(task, teamId));
	return teamTasks.map(importTaskOf);
}
