import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import { formatAmount } from '@/core/lib/utils/daily-report-figures';
import { ECurrencies } from '@/core/types/generics/enums/currency';
import type { IEmployeeRatesInput } from '@/core/types/schemas/organization/rates.schema';

/**
 * The permissions that let a caller manage every project's client rates, as Gauzy's rates routes accept either. A
 * member's own billing and pay rates need ORG_EMPLOYEES_EDIT alone (`EMPLOYEE_RATES_PERMISSION`).
 */
const RATE_ADMIN_PERMISSIONS: ReadonlyArray<string> = ['ORG_EMPLOYEES_EDIT', 'CHANGE_SELECTED_EMPLOYEE'];

/**
 * Gauzy's `PUT /employee/:id`, which sets a member's billing and pay rates, asks for this permission, and the pay rate
 * read too (an employee also reads their own).
 */
const EMPLOYEE_RATES_PERMISSION = 'ORG_EMPLOYEES_EDIT';

/** Gauzy lets someone change their own rates only with this permission, held by super admins and admins by default. */
const OWN_RATES_PERMISSION = 'CHANGE_OWN_RATES';

export const RATE_REASON_MAX_LENGTH = 500;

const DEFAULT_RATE_CURRENCY = 'USD';

/** A rate without a currency of its own is in the organization's, so a currency select starts on it. */
export function shownCurrencyOf(
	ownCurrency: string | null | undefined,
	organizationCurrency: string | null | undefined
): string {
	if (ownCurrency) {
		return ownCurrency;
	}
	if (organizationCurrency) {
		return organizationCurrency;
	}
	return DEFAULT_RATE_CURRENCY;
}

export type RateInputProblem = 'invalid' | 'negative';

interface ParsedRateInput {
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

/**
 * A member's own billing rate or weekly limit: Gauzy stores a cleared one as 0, so 0 means not set here. Pay and client
 * rates keep their 0.
 */
export function employeeRateValueOf(value: unknown): number | null {
	const rate = rateValueOf(value);
	if (rate === 0) {
		return null;
	}
	return rate;
}

/**
 * The rate a member's time is billed to the client at: their client rate on the project, else the project's, else
 * their own.
 */
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

/** A comma is a decimal mark with at most two places, so "1,000" and "1.000" are refused instead of read as 1. */
const RATE_INPUT_PATTERN = /^\d*\.?\d{0,2}$/;

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
	if (!RATE_INPUT_PATTERN.test(normalized)) {
		return { value: null, problem: 'invalid' };
	}
	return { value: number, problem: null };
}

interface EmployeeRatesValues {
	value: number | null;
	currency: string;
	weeklyLimit: number | null;
}

/**
 * The rate fields an admin changed, the others left out: a save never writes back a value another admin changed in the
 * meantime, and a member without a currency of their own keeps following the organization's until one is picked.
 */
export function changedEmployeeRatesOf(
	initial: Readonly<EmployeeRatesValues>,
	edited: Readonly<EmployeeRatesValues>
): IEmployeeRatesInput {
	const changes: IEmployeeRatesInput = {};
	const isRateChanged = edited.value !== initial.value;
	if (isRateChanged) {
		changes.billRateValue = edited.value;
	}
	const isCurrencyChanged = edited.currency !== initial.currency;
	if (isCurrencyChanged) {
		changes.billRateCurrency = edited.currency;
	}
	const isWeeklyLimitChanged = edited.weeklyLimit !== initial.weeklyLimit;
	if (isWeeklyLimitChanged) {
		changes.reWeeklyLimit = edited.weeklyLimit;
	}
	return changes;
}

interface PayRateValues {
	value: number | null;
	currency: string;
}

/** The pay rate fields an admin changed, the others left out, as for the billing rate. */
export function changedPayRateOf(
	initial: Readonly<PayRateValues>,
	edited: Readonly<PayRateValues>
): IEmployeeRatesInput {
	const changes: IEmployeeRatesInput = {};
	const isRateChanged = edited.value !== initial.value;
	if (isRateChanged) {
		changes.payRateValue = edited.value;
	}
	const isCurrencyChanged = edited.currency !== initial.currency;
	if (isCurrencyChanged) {
		changes.payRateCurrency = edited.currency;
	}
	return changes;
}

export function rateInputTextOf(value: unknown): string {
	const rate = rateValueOf(value);
	if (rate === null) {
		return '';
	}
	return String(rate);
}

export function holdsEmployeeRatesPermission(permissions: ReadonlyArray<string>): boolean {
	return permissions.includes(EMPLOYEE_RATES_PERMISSION);
}

export function holdsOwnRatesPermission(permissions: ReadonlyArray<string>): boolean {
	return permissions.includes(OWN_RATES_PERMISSION);
}

/**
 * Whether the members rate editor opens on a member. It saves through `PUT /employee/:id`, which needs
 * ORG_EMPLOYEES_EDIT (CHANGE_SELECTED_EMPLOYEE alone would not get through), and one's own row also needs
 * CHANGE_OWN_RATES.
 */
export function canEditMemberRates({
	permissions,
	hasEmployee,
	isYou
}: Readonly<{ permissions: ReadonlyArray<string>; hasEmployee: boolean; isYou: boolean }>): boolean {
	const editsEmployees = holdsEmployeeRatesPermission(permissions);
	const editsMember = editsEmployees && hasEmployee;
	if (!editsMember) {
		return false;
	}
	if (isYou) {
		return holdsOwnRatesPermission(permissions);
	}
	return true;
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

/**
 * Whether the caller may read and change a project's client rates: an organization admin, or a manager of that
 * project.
 */
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
 * Whether the caller may change one member's client rate on a project they may manage. Gauzy refuses a project
 * manager who is not an organization admin their own client rate there.
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
 * the project's People tab shows no rates, with no error shown.
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
	return codes.sort((first, second) => first.localeCompare(second));
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

export type RateRequestOutcome = 'sent' | 'nobody' | 'unavailable' | 'failed';

/** A request Gauzy accepted: sent to the admins, or to nobody when the organization has no admin to notify. */
export function rateRequestSentOutcomeOf(notified: number | undefined): RateRequestOutcome {
	const notifiedNobody = notified === 0;
	if (notifiedNobody) {
		return 'nobody';
	}
	return 'sent';
}

/** A request Gauzy did not take: a 404 means the server has no rate change requests yet. */
export function rateRequestFailureOutcomeOf(error: unknown): RateRequestOutcome {
	const status = errorStatusOf(error);
	if (status === 404) {
		return 'unavailable';
	}
	return 'failed';
}
