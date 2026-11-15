import { employeeIdOf, memberEmailOf, memberIsPlaceholderOf, memberNameOf } from '@/core/lib/utils/settings-team';
import type {
	TimeImportContext,
	TimeImportMember,
	TimeImportProject,
	TimeImportTask
} from '@/core/lib/utils/time-import-rows';
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

/** A member without an account may have been given no email: a file names them by name. */
function importMemberOf(member: TOrganizationTeamEmployee): TimeImportMember | null {
	const employeeId = employeeIdOf(member);
	const email = memberEmailOf(member);
	const isNamedOnly = memberIsPlaceholderOf(member);
	const isNameable = Boolean(email) || isNamedOnly;
	if (!employeeId || !isNameable) {
		return null;
	}
	return { employeeId, email, name: memberNameOf(member) };
}

/**
 * The context of a check, with the members added for the file (members without an account) that the team does not
 * list yet: the team reads them back a moment later. Each member is named once.
 */
export function withImportMembersAdded(
	context: TimeImportContext,
	added: ReadonlyArray<TimeImportMember>
): TimeImportContext {
	if (added.length === 0) {
		return context;
	}
	const known = new Set(context.members.map((member) => member.employeeId));
	const missing = added.filter((member) => !known.has(member.employeeId));
	return { ...context, members: [...context.members, ...missing] };
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
