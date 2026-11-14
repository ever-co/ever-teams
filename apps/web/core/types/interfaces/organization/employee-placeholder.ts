import type { ID } from '../common/base-interfaces';

/**
 * A member without an account (Gauzy `/employee-placeholder`, ever-co/ever-gauzy#11913): a person kept for time and
 * reports only. They get no email, cannot sign in and never run a timer, until they claim their time through an
 * invitation or an admin merges them into a member who has an account.
 */
export interface IEmployeePlaceholderMemberInput {
	firstName: string;
	lastName?: string;
	/** Never a login: kept to show it and to invite the person to claim their time. */
	email?: string;
}

interface IPlaceholderScope {
	tenantId: ID;
	organizationId: ID;
}

export interface IEmployeePlaceholderCreateInput extends IPlaceholderScope, IEmployeePlaceholderMemberInput {
	/** Teams of the organization the member joins. */
	teamIds?: ID[];
}

export interface IEmployeePlaceholderBulkCreateInput extends IPlaceholderScope {
	members: IEmployeePlaceholderMemberInput[];
	teamIds?: ID[];
}

/** The member Gauzy created or found, as much of it as these screens read. */
export interface IEmployeePlaceholderEmployee {
	id: ID;
	isPlaceholder?: boolean;
	placeholderEmail?: string | null;
	user?: { firstName?: string | null; lastName?: string | null } | null;
}

/** One row of a bulk creation, in the order of the input. */
export interface IEmployeePlaceholderBulkCreateItem {
	employee: IEmployeePlaceholderEmployee;
	/** False when a member of the organization already had the row's email: nothing was created for it. */
	created: boolean;
}

export interface IEmployeePlaceholderBulkCreateResult {
	items: IEmployeePlaceholderBulkCreateItem[];
}

export interface IEmployeePlaceholderClaimInput extends IPlaceholderScope {
	email: string;
	/** The page that accepts the invitation; it receives the email and the invitation code. */
	callbackUrl?: string;
}

export interface IEmployeePlaceholderMergeInput extends IPlaceholderScope {
	/** The member with an account who takes it all. */
	targetEmployeeId: ID;
}

/** What moves from a member without an account to a member with one. */
export interface IEmployeePlaceholderTransferSummary {
	timeLogs: number;
	/** Seconds of those entries. */
	duration: number;
	timesheets: number;
	taskAssignments: number;
	teams: { id: ID; name: string }[];
}

export interface IEmployeePlaceholderMergePreview extends IEmployeePlaceholderTransferSummary {
	placeholderEmployeeId: ID;
	targetEmployeeId: ID;
	/** Entries of the member without an account that overlap entries of the member it would be merged into. */
	overlappingTimeLogs: number;
}

export interface IEmployeePlaceholderMergeResult extends IEmployeePlaceholderTransferSummary {
	targetEmployeeId: ID;
}
