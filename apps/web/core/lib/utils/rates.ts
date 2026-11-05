import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import { formatAmount } from '@/core/lib/utils/daily-report-figures';
import { ECurrencies } from '@/core/types/generics/enums/currency';

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

/**
 * Whether the caller may change one member's rate on a project they may manage. Gauzy refuses a project manager who
 * is not an organization admin their own rate there: they would set their own pay.
 */
export function canEditMemberRateOnProject({
	isAdmin,
	callerEmployeeId,
	memberEmployeeId
}: Readonly<{ isAdmin: boolean; callerEmployeeId: string | null; memberEmployeeId: string }>): boolean {
	if (isAdmin) {
		return true;
	}
	return memberEmployeeId !== callerEmployeeId;
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

function supportedCurrencyCodes(): ReadonlySet<string> | null {
	const intl = Intl as typeof Intl & { supportedValuesOf?: (key: 'currency') => string[] };
	if (typeof intl.supportedValuesOf !== 'function') {
		return null;
	}
	return new Set(intl.supportedValuesOf('currency'));
}

/**
 * The currency codes a rate can be set in: Gauzy's list (`ECurrencies`, keyed by ISO code) without the historic
 * codes the browser no longer knows, and always the current value so an old one stays selectable.
 */
export function currencyCodesOf(current: string | null | undefined): string[] {
	const supported = supportedCurrencyCodes();
	const codes = Object.keys(ECurrencies).filter((code) => {
		if (!supported) {
			return true;
		}
		return supported.has(code);
	});
	const hasCurrent = Boolean(current);
	const isListed = hasCurrent && codes.includes(current as string);
	if (hasCurrent && !isListed) {
		codes.push(current as string);
	}
	return codes.sort();
}

export function currencyLabelOf(code: string, locale: string): string {
	try {
		const names = new Intl.DisplayNames([locale], { type: 'currency' });
		const name = names.of(code);
		if (!name || name === code) {
			return code;
		}
		return `${code} · ${name}`;
	} catch {
		return code;
	}
}

/** A rate as money when its currency is known, else as a bare number; null when there is no rate. */
export function rateAmountTextOf(value: unknown, currency: string | null | undefined, locale: string): string | null {
	const rate = rateValueOf(value);
	if (rate === null) {
		return null;
	}
	if (!currency) {
		return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(rate);
	}
	return formatAmount({ currency, amount: rate }, locale);
}
