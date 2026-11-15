/**
 * A saved report (Gauzy `/api/saved-reports`, ever-co/ever-gauzy#11912): a report a member set up once (its period,
 * filters and grouping) and reopens in one click. Its author can turn a read-only link on; anyone with the link reads
 * the report without signing in (`GET /api/public/saved-reports/:token`), computed when the link is opened.
 */

type SavedReportKind = 'TIME_AND_ACTIVITY';

/** A period stated as a rule, evaluated on the day the report is read: the period presets of the report pages. */
type SavedReportPeriodRule =
	| 'today'
	| 'yesterday'
	| 'thisWeek'
	| 'lastWeek'
	| 'last7Days'
	| 'last14Days'
	| 'thisMonth'
	| 'lastMonth';

type SavedReportGrouping = 'date' | 'member' | 'project' | 'client' | 'task' | 'week';

export interface ISavedReportFilters {
	teamIds?: string[];
	/** Members, by employee id. */
	employeeIds?: string[];
	projectIds?: string[];
	/** Clients, by id; `none` keeps the time without a client. */
	clientIds?: string[];
	taskIds?: string[];
	billableOnly?: boolean;
}

export interface ISavedReport {
	id: string;
	tenantId?: string;
	organizationId?: string;
	authorId: string;
	name: string;
	kind: SavedReportKind;
	/** `null` when the report keeps fixed dates. */
	periodRule?: SavedReportPeriodRule | null;
	/** `YYYY-MM-DD`; `null` when the report keeps a rule. */
	startDate?: string | null;
	/** `YYYY-MM-DD`, included; `null` when the report keeps a rule. */
	endDate?: string | null;
	timeZone?: string | null;
	filters?: ISavedReportFilters | null;
	grouping?: SavedReportGrouping | null;
	/** Whether the link shows amounts. Off by default. */
	includeAmounts?: boolean;
	/** When the current link was turned on; `null` while no link is on. */
	sharedAt?: string | null;
	/** When the current link stops working; `null` when it does not expire. */
	shareExpiresAt?: string | null;
	/** Whether a link is on and not expired. */
	isShared?: boolean;
	createdAt?: string;
	updatedAt?: string;
}

export interface ISavedReportInput {
	name: string;
	kind?: SavedReportKind;
	periodRule?: SavedReportPeriodRule | null;
	startDate?: string | null;
	endDate?: string | null;
	timeZone?: string | null;
	filters?: ISavedReportFilters | null;
	grouping?: SavedReportGrouping | null;
	includeAmounts?: boolean;
}

export interface ISavedReportCreateInput extends ISavedReportInput {
	tenantId: string;
	organizationId: string;
}

/** What `PUT /saved-reports/:id` takes: the fields sent replace the stored ones. */
export type ISavedReportUpdateInput = Partial<ISavedReportInput>;

export interface ISavedReportShareInput {
	/** When the link stops working (ISO date); none for a link that does not expire. */
	expiresAt?: string | null;
}

/** The token the link carries, given once: only its digest is stored. */
export interface ISavedReportShareResponse {
	token: string;
	sharedAt: string;
	shareExpiresAt: string | null;
}

interface IPublicSavedReportNamed {
	id: string;
	name: string;
}

interface IPublicSavedReportMember {
	id: string;
	fullName: string;
	user: { firstName: string | null; lastName: string | null; name: string | null };
	billRateValue?: number | null;
	billRateCurrency?: string | null;
}

export interface IPublicSavedReportTask {
	task: { id: string; title: string; number?: number | null; prefix?: string | null } | null;
	duration: number;
	client: IPublicSavedReportNamed | null;
	organizationTeamId?: string | null;
}

interface IPublicSavedReportMemberLog {
	employee: IPublicSavedReportMember;
	/** Seconds. */
	sum: number;
	tasks: IPublicSavedReportTask[];
	amount?: number | null;
}

interface IPublicSavedReportDay {
	date: string;
	/** Seconds. */
	sum: number;
	logs: {
		project:
			| (IPublicSavedReportNamed & {
					color?: string | null;
					organizationContact?: IPublicSavedReportNamed | null;
			  })
			| null;
		employeeLogs: IPublicSavedReportMemberLog[];
	}[];
}

interface IPublicSavedReportAmount {
	currency: string;
	amount: number;
}

/** `GET /public/saved-reports/:token`: report fields only. */
export interface IPublicSavedReport {
	name: string;
	kind: SavedReportKind;
	grouping: SavedReportGrouping | null;
	includeAmounts: boolean;
	period: {
		rule: SavedReportPeriodRule | null;
		/** `YYYY-MM-DD` in `timeZone`. */
		startDate: string;
		/** `YYYY-MM-DD` in `timeZone`, included. */
		endDate: string;
		timeZone: string;
	};
	generatedAt: string;
	days: IPublicSavedReportDay[];
	totals: {
		/** Seconds. */
		duration: number;
		amounts?: IPublicSavedReportAmount[];
	};
}
