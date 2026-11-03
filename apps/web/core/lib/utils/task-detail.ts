import moment from 'moment';
import { getDailyPlanDay } from '@/core/lib/helpers/daily-plan-day';
import { isTaskFinished } from '@/core/lib/helpers/task';
import { EIssueType } from '@/core/types/generics/enums/task';
import type { TOrganizationTeamEmployee } from '@/core/types/schemas';
import type { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';
import type { TTask } from '@/core/types/schemas/task/task.schema';

interface TaskStatEntry {
	id?: string;
	duration?: number;
}

export interface TaskMemberTime {
	id: string;
	userId: string | null;
	name: string;
	imageUrl: string | null | undefined;
	seconds: number;
}

interface TaskTimeFigures {
	ownSeconds: number;
	ownTodaySeconds: number;
	/** The assignees together. */
	groupSeconds: number;
	members: TaskMemberTime[];
	remainingSeconds: number | null;
}

export interface PlannedMember {
	key: string;
	name: string;
	imageUrl: string | null | undefined;
	days: string[];
}

interface ChildProgress {
	done: number;
	total: number;
}

function statEntriesOf(value: unknown): TaskStatEntry[] {
	if (!Array.isArray(value)) {
		return [];
	}
	return value as TaskStatEntry[];
}

function firstDurationOf(entries: TaskStatEntry[], taskId: string) {
	const entry = entries.find((candidate) => candidate?.id === taskId);
	return entry?.duration ?? 0;
}

function sumDurationsOf(entries: TaskStatEntry[], taskId: string) {
	let total = 0;
	for (const entry of entries) {
		const isThisTask = entry?.id === taskId;
		if (isThisTask) {
			total += entry.duration ?? 0;
		}
	}
	return total;
}

function isAssignedMember(task: TTask, member: TOrganizationTeamEmployee) {
	const assignees = task.members ?? [];
	return assignees.some((assignee) => assignee.id === member.employeeId);
}

function memberTimeOf(member: TOrganizationTeamEmployee, taskId: string): TaskMemberTime {
	const entries = statEntriesOf(member.totalWorkedTasks);
	const user = member.employee?.user;
	const name = member.employee?.fullName ?? user?.name ?? '';
	return {
		id: member.id,
		userId: member.employee?.userId ?? null,
		name,
		imageUrl: user?.imageUrl,
		seconds: firstDurationOf(entries, taskId)
	};
}

function remainingOf(estimate: number | null | undefined, groupSeconds: number) {
	const hasEstimate = typeof estimate === 'number' && estimate > 0;
	if (!hasEstimate) {
		return null;
	}
	const remaining = estimate - groupSeconds;
	return Math.max(remaining, 0);
}

function byMostTimeFirst(first: TaskMemberTime, second: TaskMemberTime) {
	return second.seconds - first.seconds;
}

export function taskTimeFiguresOf(
	task: TTask,
	members: TOrganizationTeamEmployee[],
	currentUserId: string | null | undefined
): TaskTimeFigures {
	const currentMember = members.find((member) => member.employee?.user?.id === currentUserId);
	const ownEntries = statEntriesOf(currentMember?.totalWorkedTasks);
	const ownTodayEntries = statEntriesOf(currentMember?.totalTodayTasks);
	const assignedMembers = members.filter((member) => isAssignedMember(task, member));
	let groupSeconds = 0;
	for (const member of assignedMembers) {
		groupSeconds += sumDurationsOf(statEntriesOf(member.totalWorkedTasks), task.id);
	}
	const memberTimes = assignedMembers.map((member) => memberTimeOf(member, task.id));
	memberTimes.sort(byMostTimeFirst);
	return {
		ownSeconds: firstDurationOf(ownEntries, task.id),
		ownTodaySeconds: firstDurationOf(ownTodayEntries, task.id),
		groupSeconds,
		members: memberTimes,
		remainingSeconds: remainingOf(task.estimate, groupSeconds)
	};
}

export function formatWorkedTime(seconds: number) {
	const safeSeconds = Math.max(Math.floor(seconds), 0);
	const hours = Math.floor(safeSeconds / 3600);
	const minutes = Math.floor((safeSeconds % 3600) / 60);
	const paddedMinutes = String(minutes).padStart(2, '0');
	if (hours === 0) {
		return `${minutes}m`;
	}
	return `${hours}h ${paddedMinutes}m`;
}

function planOwnerKey(plan: TDailyPlan) {
	const employeeId = plan.employeeId ?? plan.employee?.id;
	if (employeeId) {
		return String(employeeId);
	}
	return String(plan.employee?.fullName ?? '');
}

/** Plan days are `YYYY-MM-DD` strings: sorting and comparing them as text follows the calendar. */
export function plannedMembersOf(plans: TDailyPlan[]): PlannedMember[] {
	const byOwner = new Map<string, PlannedMember>();
	for (const plan of plans) {
		const name = plan.employee?.fullName;
		const hasName = typeof name === 'string' && name.length > 0;
		if (!hasName) {
			continue;
		}
		const key = planOwnerKey(plan);
		const existing = byOwner.get(key);
		const day = getDailyPlanDay(plan.date);
		if (existing) {
			existing.days.push(day);
			continue;
		}
		byOwner.set(key, { key, name, imageUrl: plan.employee?.user?.imageUrl, days: [day] });
	}
	const members = [...byOwner.values()];
	for (const member of members) {
		member.days.sort((first, second) => first.localeCompare(second));
	}
	return members;
}

export function nextPlannedDayOf(days: string[], today: string) {
	const upcoming = days.find((day) => day >= today);
	return upcoming ?? null;
}

export function todayPlanDay() {
	return moment().format('YYYY-MM-DD');
}

export function childProgressOf(children: TTask[] | undefined): ChildProgress {
	const list = children ?? [];
	const done = list.filter((child) => isTaskFinished(child.status)).length;
	return { done, total: list.length };
}

function hasNoIssueType(task: TTask) {
	return !task.issueType;
}

function isTaskOrBug(task: TTask) {
	const isTask = task.issueType === EIssueType.TASK;
	const isBug = task.issueType === EIssueType.BUG;
	return isTask || isBug || hasNoIssueType(task);
}

function canBeChildOf(parent: TTask, candidate: TTask) {
	if (parent.issueType === EIssueType.EPIC) {
		return candidate.issueType !== EIssueType.EPIC;
	}
	return isTaskOrBug(candidate);
}

function canBeParentOf(child: TTask, candidate: TTask) {
	const isEpicCandidate = candidate.issueType === EIssueType.EPIC;
	const isStoryCandidate = candidate.issueType === EIssueType.STORY;
	if (child.issueType === EIssueType.EPIC) {
		return false;
	}
	if (child.issueType === EIssueType.STORY) {
		return isEpicCandidate;
	}
	return isEpicCandidate || isStoryCandidate;
}

export function canHaveParent(task: TTask) {
	return task.issueType !== EIssueType.EPIC;
}

function idsOf(tasks: TTask[] | undefined) {
	return new Set((tasks ?? []).map((task) => task.id));
}

export function childCandidatesOf(task: TTask, teamTasks: TTask[]) {
	const childIds = idsOf(task.children);
	return teamTasks.filter((candidate) => {
		const isSelf = candidate.id === task.id;
		const isChild = childIds.has(candidate.id);
		const isAllowed = canBeChildOf(task, candidate);
		return !isSelf && !isChild && isAllowed;
	});
}

export function parentCandidatesOf(task: TTask, teamTasks: TTask[]) {
	const childIds = idsOf(task.children);
	return teamTasks.filter((candidate) => {
		const isSelf = candidate.id === task.id;
		const isChild = childIds.has(candidate.id);
		const isCurrentParent = candidate.id === task.parentId;
		const isAllowed = canBeParentOf(task, candidate);
		return !isSelf && !isChild && !isCurrentParent && isAllowed;
	});
}

function linkedTaskIdsOf(task: TTask) {
	const ids = new Set<string>();
	for (const link of task.linkedIssues ?? []) {
		const linkedId = link.taskFrom?.id;
		if (linkedId) {
			ids.add(linkedId);
		}
	}
	return ids;
}

export function relationCandidatesOf(task: TTask, teamTasks: TTask[]) {
	const linkedIds = linkedTaskIdsOf(task);
	return teamTasks.filter((candidate) => {
		const isSelf = candidate.id === task.id;
		const isLinked = linkedIds.has(candidate.id);
		return !isSelf && !isLinked;
	});
}

export function acceptsStartDate(date: Date, dueDate: Date | string | null | undefined) {
	if (!dueDate) {
		return true;
	}
	return date <= new Date(dueDate);
}

export function acceptsDueDate(date: Date, startDate: Date | string | null | undefined) {
	if (!startDate) {
		return true;
	}
	return date >= new Date(startDate);
}

export function daysUntilDue(dueDate: Date | string | null | undefined, now: Date = new Date()) {
	if (!dueDate) {
		return null;
	}
	const due = moment(dueDate).startOf('day');
	const today = moment(now).startOf('day');
	return due.diff(today, 'days');
}

export function neighboursIn(sequence: string[], taskId: string) {
	const index = sequence.indexOf(taskId);
	const isInSequence = index >= 0;
	if (!isInSequence) {
		return { previousId: null, nextId: null, position: 0, total: 0 };
	}
	return {
		previousId: sequence[index - 1] ?? null,
		nextId: sequence[index + 1] ?? null,
		position: index + 1,
		total: sequence.length
	};
}
