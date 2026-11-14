import type { DottedLanguageObjectStringPaths } from 'next-intl';
import type { TeamPerson } from '@/core/lib/utils/dashboards/team';
import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import {
	ETimeGoalComparison,
	ETimeGoalPeriod,
	ETimeGoalScope,
	type ITimeGoal,
	type ITimeGoalCreateInput,
	type ITimeGoalProgress,
	type ITimeGoalUpdateInput
} from '@/core/types/interfaces/timesheet/time-goal';

/** The platform's limit on a goal's name. */
export const GOAL_NAME_MAX_LENGTH = 255;

/** The periods of the page's switch, shortest first. */
export const GOAL_PERIODS: ReadonlyArray<ETimeGoalPeriod> = [
	ETimeGoalPeriod.DAY,
	ETimeGoalPeriod.WEEK,
	ETimeGoalPeriod.MONTH
];

/** The most hours a period holds, as the platform checks them: a day, a week, a month of 31 days. */
const MAX_HOURS_OF_PERIOD: Record<ETimeGoalPeriod, number> = {
	[ETimeGoalPeriod.DAY]: 24,
	[ETimeGoalPeriod.WEEK]: 7 * 24,
	[ETimeGoalPeriod.MONTH]: 31 * 24
};

/** The platform keeps two decimals of an hour. */
const HOURS_DECIMALS = 2;

// ---------------------------------------------------------------- figures

/** Tracked time as a share of the target, in percent (past 100 when the target is passed). */
export function goalShareOf(trackedSeconds: number, targetSeconds: number): number {
	if (targetSeconds <= 0) {
		return 0;
	}
	return (trackedSeconds / targetSeconds) * 100;
}

/** What is left of a target, or how far past it the time went. */
export interface GoalGap {
	kind: 'toGo' | 'reached' | 'over';
	seconds: number;
}

export function goalGapOf(trackedSeconds: number, targetSeconds: number): GoalGap {
	const difference = Math.round(targetSeconds - trackedSeconds);
	if (difference > 0) {
		return { kind: 'toGo', seconds: difference };
	}
	if (difference < 0) {
		return { kind: 'over', seconds: -difference };
	}
	return { kind: 'reached', seconds: 0 };
}

// ---------------------------------------------------------------- lists

export function activeGoalsOf(goals: ReadonlyArray<ITimeGoal>): ITimeGoal[] {
	return goals.filter((goal) => goal.isArchived !== true);
}

export function archivedGoalsOf(goals: ReadonlyArray<ITimeGoal>): ITimeGoal[] {
	return goals.filter((goal) => goal.isArchived === true);
}

/** The period the switch opens on: the week when a weekly goal is there, else the first period that has a goal. */
export function defaultGoalPeriodOf(rows: ReadonlyArray<Pick<ITimeGoalProgress, 'period'>>): ETimeGoalPeriod {
	const hasWeekly = rows.some((row) => row.period === ETimeGoalPeriod.WEEK);
	if (hasWeekly) {
		return ETimeGoalPeriod.WEEK;
	}
	const firstWithGoal = GOAL_PERIODS.find((period) => rows.some((row) => row.period === period));
	return firstWithGoal ?? ETimeGoalPeriod.WEEK;
}

export function progressOfPeriod<T extends Pick<ITimeGoalProgress, 'period'>>(
	rows: ReadonlyArray<T>,
	period: ETimeGoalPeriod
): T[] {
	return rows.filter((row) => row.period === period);
}

/** How many of the rows each period holds, for the switch. */
export function goalCountsByPeriodOf(rows: ReadonlyArray<Pick<ITimeGoalProgress, 'period'>>) {
	const counts: Record<ETimeGoalPeriod, number> = {
		[ETimeGoalPeriod.DAY]: 0,
		[ETimeGoalPeriod.WEEK]: 0,
		[ETimeGoalPeriod.MONTH]: 0
	};
	for (const row of rows) {
		counts[row.period] += 1;
	}
	return counts;
}

/** The rows of the signed-in member themselves. */
export function ownProgressOf(rows: ReadonlyArray<ITimeGoalProgress>, employeeId: string | null): ITimeGoalProgress[] {
	if (!employeeId) {
		return [];
	}
	return rows.filter((row) => row.employeeId === employeeId);
}

export interface MemberGoalGroup {
	person: TeamPerson;
	rows: ITimeGoalProgress[];
}

/**
 * The rows of every other member, one group per member, by name. A member the team list does not hold (yet) keeps
 * their rows, under an empty name.
 */
export function memberGoalGroupsOf(
	rows: ReadonlyArray<ITimeGoalProgress>,
	members: ReadonlyArray<TeamPerson>,
	ownEmployeeId: string | null
): MemberGoalGroup[] {
	const groups = new Map<string, MemberGoalGroup>();
	for (const row of rows) {
		if (row.employeeId === ownEmployeeId) {
			continue;
		}
		let group = groups.get(row.employeeId);
		if (!group) {
			const known = members.find((member) => member.employeeId === row.employeeId);
			const person = known ?? { employeeId: row.employeeId, name: '', imageUrl: null };
			group = { person, rows: [] };
			groups.set(row.employeeId, group);
		}
		group.rows.push(row);
	}
	const sorted = [...groups.values()];
	sorted.sort((first, second) => first.person.name.localeCompare(second.person.name));
	return sorted;
}

// ---------------------------------------------------------------- form

/** Whom a new goal counts: the person themselves, one member they manage, or every member of the active team. */
export type GoalOwnerChoice = 'self' | 'member' | 'team';

export interface GoalDraft {
	name: string;
	comparison: ETimeGoalComparison;
	/** As typed: a dot or a comma for the decimals. */
	hours: string;
	period: ETimeGoalPeriod;
	owner: GoalOwnerChoice;
	memberId: string | null;
	projectIds: string[];
	clientIds: string[];
	billableOnly: boolean;
}

export const EMPTY_GOAL_DRAFT: GoalDraft = {
	name: '',
	comparison: ETimeGoalComparison.AT_LEAST,
	hours: '',
	period: ETimeGoalPeriod.WEEK,
	owner: 'self',
	memberId: null,
	projectIds: [],
	clientIds: [],
	billableOnly: false
};

/** A number of hours as typed, `7.5` or `7,5`; null when it is not a number. */
export function parseGoalHours(text: string): number | null {
	const normalized = text.trim().replace(',', '.');
	if (!/^\d+(\.\d+)?$/.test(normalized)) {
		return null;
	}
	return Number(normalized);
}

function hasTooManyDecimals(text: string) {
	const decimals = text.trim().replace(',', '.').split('.')[1] ?? '';
	return decimals.length > HOURS_DECIMALS;
}

export type GoalDraftErrors = Partial<Record<'name' | 'hours' | 'member', DottedLanguageObjectStringPaths>>;

function hoursErrorOf(draft: GoalDraft): DottedLanguageObjectStringPaths | undefined {
	const hours = parseGoalHours(draft.hours);
	if (hours === null || hours <= 0) {
		return 'dashboard.goals.form.HOURS_REQUIRED';
	}
	if (hasTooManyDecimals(draft.hours)) {
		return 'dashboard.goals.form.HOURS_PRECISION';
	}
	if (hours > MAX_HOURS_OF_PERIOD[draft.period]) {
		return 'dashboard.goals.form.HOURS_TOO_MANY';
	}
	return undefined;
}

/** What keeps a draft from being saved; empty when it may be. */
export function goalDraftErrorsOf(draft: GoalDraft): GoalDraftErrors {
	const errors: GoalDraftErrors = {};
	if (!draft.name.trim()) {
		errors.name = 'dashboard.goals.form.NAME_REQUIRED';
	}
	const hoursError = hoursErrorOf(draft);
	if (hoursError) {
		errors.hours = hoursError;
	}
	const missesMember = draft.owner === 'member' && !draft.memberId;
	if (missesMember) {
		errors.member = 'dashboard.goals.form.MEMBER_REQUIRED';
	}
	return errors;
}

function ruleOf(draft: GoalDraft) {
	return {
		name: draft.name.trim(),
		comparison: draft.comparison,
		targetHours: parseGoalHours(draft.hours) ?? 0,
		period: draft.period
	};
}

/** The goal a valid draft creates; the person's own goal names no member (the platform reads the caller). */
export function createInputOf(draft: GoalDraft, activeTeamId: string | null): ITimeGoalCreateInput {
	const owner: Pick<ITimeGoalCreateInput, 'scope' | 'employeeId' | 'organizationTeamId'> = {
		scope: ETimeGoalScope.EMPLOYEE
	};
	if (draft.owner === 'member' && draft.memberId) {
		owner.employeeId = draft.memberId;
	}
	if (draft.owner === 'team' && activeTeamId) {
		owner.scope = ETimeGoalScope.TEAM;
		owner.organizationTeamId = activeTeamId;
	}
	return {
		...ruleOf(draft),
		...owner,
		billableOnly: draft.billableOnly,
		projectIds: draft.projectIds,
		organizationContactIds: draft.clientIds
	};
}

/** What an edit sends: everything a goal asks for; whom it counts stays as it was set. */
export function updateInputOf(draft: GoalDraft): ITimeGoalUpdateInput {
	return {
		...ruleOf(draft),
		billableOnly: draft.billableOnly,
		projectIds: draft.projectIds,
		organizationContactIds: draft.clientIds
	};
}

function idsOf(items: ITimeGoal['projects']) {
	return (items ?? []).map((item) => item.id);
}

function ownerChoiceOf(goal: ITimeGoal): GoalOwnerChoice {
	if (goal.scope === ETimeGoalScope.TEAM) {
		return 'team';
	}
	return 'self';
}

export function draftOfGoal(goal: ITimeGoal): GoalDraft {
	return {
		name: goal.name,
		comparison: goal.comparison,
		hours: String(goal.targetHours),
		period: goal.period,
		owner: ownerChoiceOf(goal),
		memberId: goal.employeeId ?? null,
		projectIds: idsOf(goal.projects),
		clientIds: idsOf(goal.organizationContacts),
		billableOnly: goal.billableOnly === true
	};
}

// ---------------------------------------------------------------- access

export interface GoalWriter {
	employeeId: string | null;
	/** The active team, when the person is flagged as one of its managers. */
	managedTeamId: string | null;
	/** The members of that team. */
	managedMemberIds: ReadonlyArray<string>;
	/** `CHANGE_SELECTED_EMPLOYEE`: the platform lets them act for every member. */
	actsForEveryone: boolean;
}

/**
 * Whether the page offers to change a goal: their own, those of the members and of the team they manage, or any for
 * someone who acts for everyone. The platform has the last word and refuses anything else.
 */
export function mayChangeGoal(goal: ITimeGoal, writer: GoalWriter): boolean {
	if (writer.actsForEveryone) {
		return true;
	}
	if (goal.scope === ETimeGoalScope.EMPLOYEE) {
		const isOwn = Boolean(goal.employeeId) && goal.employeeId === writer.employeeId;
		const isManagedMember =
			Boolean(writer.managedTeamId) && writer.managedMemberIds.includes(goal.employeeId ?? '');
		return isOwn || isManagedMember;
	}
	if (goal.scope === ETimeGoalScope.TEAM) {
		return Boolean(writer.managedTeamId) && goal.organizationTeamId === writer.managedTeamId;
	}
	return false;
}

/** A platform without time goals answers 404 (and some proxies 405 or 501). */
export function isGoalsUnavailableError(error: unknown): boolean {
	const status = errorStatusOf(error);
	return status === 404 || status === 405 || status === 501;
}
