import { errorStatusOf } from '@/core/lib/utils/error-feedback';

/**
 * The permissions that let a caller set any member's rate and every project's rates. Gauzy's `PUT /employee/:id`
 * asks for ORG_EMPLOYEES_EDIT; a holder of CHANGE_SELECTED_EMPLOYEE acts for every employee anyway.
 */
export const RATE_ADMIN_PERMISSIONS: ReadonlyArray<string> = ['ORG_EMPLOYEES_EDIT', 'CHANGE_SELECTED_EMPLOYEE'];

export const RATE_REASON_MAX_LENGTH = 500;

export type RateInputProblem = 'invalid' | 'negative';

export interface ParsedRateInput {
	value: number | null;
	problem: RateInputProblem | null;
}

/**
 * A rate as Gauzy stores it: a decimal column, which some databases return as a string ("45.00"). A missing,
 * unreadable or negative value is no rate at all.
 */
export function rateValueOf(value: unknown): number | null {
	if (value === null || value === undefined || value === '') {
		return null;
	}
	const number = Number(value);
	if (!Number.isFinite(number)) {
		return null;
	}
	if (number < 0) {
		return null;
	}
	return number;
}

/** The rate a member's time is counted at: their rate on the project, else the project's, else their own. */
export function effectiveBillRate({
	memberRate,
	projectRate,
	employeeRate
}: Readonly<{ memberRate?: unknown; projectRate?: unknown; employeeRate?: unknown }>): number | null {
	const candidates = [memberRate, projectRate, employeeRate];
	for (const candidate of candidates) {
		const rate = rateValueOf(candidate);
		if (rate !== null) {
			return rate;
		}
	}
	return null;
}

/** Reads what a person typed in a rate field. An empty field clears the rate. */
export function parseRateInput(text: string): ParsedRateInput {
	const trimmed = text.trim();
	if (trimmed === '') {
		return { value: null, problem: null };
	}
	const normalized = trimmed.replace(',', '.');
	const number = Number(normalized);
	if (!Number.isFinite(number)) {
		return { value: null, problem: 'invalid' };
	}
	if (number < 0) {
		return { value: null, problem: 'negative' };
	}
	return { value: number, problem: null };
}

export function rateInputTextOf(value: unknown): string {
	const rate = rateValueOf(value);
	if (rate === null) {
		return '';
	}
	return String(rate);
}

export function holdsRateAdminPermission(permissions: ReadonlyArray<string>): boolean {
	return permissions.some((permission) => RATE_ADMIN_PERMISSIONS.includes(permission));
}

interface ProjectMemberLike {
	employeeId?: string | null;
	isManager?: boolean | null;
	isActive?: boolean | null;
	isArchived?: boolean | null;
}

function isCurrentManagerRow(member: ProjectMemberLike, employeeId: string): boolean {
	const isEmployee = member.employeeId === employeeId;
	const isManager = member.isManager === true;
	const isCurrent = member.isActive !== false && member.isArchived !== true;
	return isEmployee && isManager && isCurrent;
}

/** Whether the caller may read and change a project's rates: an organization admin, or a manager of that project. */
export function canManageProjectRates({
	permissions,
	members,
	employeeId
}: Readonly<{
	permissions: ReadonlyArray<string>;
	members: ReadonlyArray<ProjectMemberLike> | null | undefined;
	employeeId: string | null | undefined;
}>): boolean {
	if (holdsRateAdminPermission(permissions)) {
		return true;
	}
	if (!employeeId) {
		return false;
	}
	const rows = members ?? [];
	return rows.some((member) => isCurrentManagerRow(member, employeeId));
}

const UNAVAILABLE_STATUSES: ReadonlyArray<number> = [403, 404];

/**
 * A rates read the API answers with 404 (a Gauzy without the rates routes) or 403 (rates the caller may not see):
 * the screens fall back to the employee's own rate, with no error shown.
 */
export function isRatesReadUnavailable(error: unknown): boolean {
	const status = errorStatusOf(error);
	if (status === null) {
		return false;
	}
	return UNAVAILABLE_STATUSES.includes(status);
}
