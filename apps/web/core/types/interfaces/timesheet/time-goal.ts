/**
 * The platform's time goals (`/time-goals`, ever-co/ever-gauzy#11918): how many hours a member, or each member of a
 * team or of the organization, holds to per day, week or month, and where each member stands against them.
 */

export enum ETimeGoalComparison {
	AT_LEAST = 'AT_LEAST',
	AT_MOST = 'AT_MOST'
}

export enum ETimeGoalPeriod {
	DAY = 'DAY',
	WEEK = 'WEEK',
	MONTH = 'MONTH'
}

export enum ETimeGoalScope {
	EMPLOYEE = 'EMPLOYEE',
	TEAM = 'TEAM',
	ORGANIZATION = 'ORGANIZATION'
}

/** In progress or achieved for "at least", on track or exceeded for "at most". */
export enum ETimeGoalState {
	IN_PROGRESS = 'IN_PROGRESS',
	ACHIEVED = 'ACHIEVED',
	ON_TRACK = 'ON_TRACK',
	EXCEEDED = 'EXCEEDED'
}

/** A project or a client a goal counts, as the platform answers it. */
export interface ITimeGoalLinkedItem {
	id: string;
	name?: string | null;
}

export interface ITimeGoal {
	id: string;
	name: string;
	comparison: ETimeGoalComparison;
	targetHours: number;
	period: ETimeGoalPeriod;
	scope: ETimeGoalScope;
	billableOnly?: boolean;
	employeeId?: string | null;
	organizationTeamId?: string | null;
	projects?: ITimeGoalLinkedItem[];
	organizationContacts?: ITimeGoalLinkedItem[];
	isArchived?: boolean;
	archivedAt?: string | null;
	createdAt?: string;
	organizationId?: string;
	tenantId?: string;
}

export interface ITimeGoalList {
	items: ITimeGoal[];
	total: number;
}

/** A goal to create. A member goal without `employeeId` is the caller's own. */
export interface ITimeGoalCreateInput {
	name: string;
	comparison: ETimeGoalComparison;
	targetHours: number;
	period: ETimeGoalPeriod;
	scope: ETimeGoalScope;
	billableOnly?: boolean;
	employeeId?: string;
	organizationTeamId?: string;
	projectIds?: string[];
	organizationContactIds?: string[];
}

/** What a goal asks for, changed; whom it counts is fixed at creation. Lists sent replace the goal's. */
export type ITimeGoalUpdateInput = Partial<
	Pick<
		ITimeGoalCreateInput,
		'name' | 'comparison' | 'targetHours' | 'period' | 'billableOnly' | 'projectIds' | 'organizationContactIds'
	>
>;

/** One member against one goal, over the period of the goal that holds the date read (today by default). */
export interface ITimeGoalProgress {
	goalId: string;
	goal: ITimeGoal;
	employeeId: string;
	period: ETimeGoalPeriod;
	/** Local dates (YYYY-MM-DD) of the first and last day of the period, in the member's time zone. */
	startDate: string;
	endDate: string;
	timeZone: string;
	trackedSeconds: number;
	targetSeconds: number;
	state: ETimeGoalState;
}

export interface ITimeGoalProgressQuery {
	/** The members of this team the caller may read; the caller alone when absent. */
	organizationTeamId?: string;
}
