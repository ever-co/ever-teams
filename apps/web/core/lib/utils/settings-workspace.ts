import { renameWorkspaceBodySchema } from '@/core/lib/validation/workspace';
import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import {
	WORKSPACE_DATE_FORMATS,
	WORKSPACE_NUMBER_FORMATS,
	dateFormatOf,
	numberFormatOf,
	workspaceClockOf,
	workspaceCurrencyPositionOf,
	workspaceDateFormatOf,
	workspaceNumberFormatOf,
	type WorkspaceClock,
	type WorkspaceCurrencyPosition,
	type WorkspaceDateFormat,
	type WorkspaceLocale,
	type WorkspaceNumberFormat
} from '@/core/lib/utils/workspace-formats';
import { EWeekDays } from '@/core/types/generics/enums/date';
import { ERoleName } from '@/core/types/generics/enums/role';
import { organizationSchema, type TOrganization } from '@/core/types/schemas/organization/organization.schema';
import type { TWorkspace } from '@/core/types/schemas/team/organization-team.schema';

/** Gauzy asks for this permission on every write of an organization: its currency and its formats. */
const WORKSPACE_EDIT_PERMISSION = 'ALL_ORG_EDIT';

export function canEditWorkspace(permissions: ReadonlyArray<string>): boolean {
	return permissions.includes(WORKSPACE_EDIT_PERMISSION);
}

/**
 * The name the workspace switcher shows is the tenant's, which Gauzy lets the super admin alone change. The
 * organization takes the same name, so its own permission is needed too.
 */
export function canRenameWorkspace(roleName: string | null | undefined, permissions: ReadonlyArray<string>): boolean {
	const isSuperAdmin = roleName === ERoleName.SUPER_ADMIN;
	return isSuperAdmin && canEditWorkspace(permissions);
}

export function isWorkspaceNameValid(name: string): boolean {
	return renameWorkspaceBodySchema.safeParse({ name }).success;
}

/**
 * Whether the API answered a rename with a refusal (a 4xx), which a new try would get again: the half already written
 * is undone. A failure without an answer, or a server error, may pass on a new try, which finishes the rename.
 */
export function isRenameRefused(error: unknown): boolean {
	const status = errorStatusOf(error);
	if (status === null) {
		return false;
	}
	return status >= 400 && status < 500;
}

/**
 * Whether a rename the tenant did not take may have left the workspace under two names: the tenant's answer is unknown
 * (none, or a server error), or the organization may keep the new name this save gave it.
 */
export function isRenameMaybeUnfinished(tenantError: unknown, mayOrganizationKeepTheName: boolean): boolean {
	if (!isRenameRefused(tenantError)) {
		return true;
	}
	return mayOrganizationKeepTheName;
}

/** A rename that may have stopped halfway: saving the same name again finishes it. */
export class UnfinishedRenameError extends Error {
	constructor(cause: unknown) {
		super('The workspace rename may not have finished', { cause });
		this.name = 'UnfinishedRenameError';
	}
}

/**
 * The organization every screen reads, once a save went through. The API answers a save with the organization as it
 * stored it, which also holds what another admin changed since this page read it. It goes over the page's copy with
 * the change, so a field an answer leaves out keeps its known value; an answer that does not read as an organization
 * leaves that copy as it is.
 */
export function organizationAfterSave(
	pageCopy: TOrganization,
	changes: Partial<TOrganization>,
	apiAnswer: unknown
): TOrganization {
	const changedCopy = { ...pageCopy, ...changes };
	const stored = organizationSchema.safeParse(apiAnswer);
	if (stored.success) {
		return { ...changedCopy, ...stored.data };
	}
	return changedCopy;
}

export function workspaceOfTenant(
	workspaces: ReadonlyArray<TWorkspace>,
	tenantId: string | null | undefined
): TWorkspace | null {
	if (!tenantId) {
		return null;
	}
	const workspace = workspaces.find((candidate) => candidate.user.tenant.id === tenantId);
	return workspace ?? null;
}

function renamedWorkspaceOf(workspace: TWorkspace, tenantId: string, name: string): TWorkspace {
	if (workspace.user.tenant.id !== tenantId) {
		return workspace;
	}
	const tenant = { ...workspace.user.tenant, name };
	const user = { ...workspace.user, tenant };
	return { ...workspace, user };
}

/** The workspace list with one workspace renamed, for the switcher to show the name before the list is read again. */
export function workspacesAfterRename(
	workspaces: ReadonlyArray<TWorkspace>,
	tenantId: string,
	name: string
): TWorkspace[] {
	return workspaces.map((workspace) => renamedWorkspaceOf(workspace, tenantId, name));
}

/** What a format select holds when the organization stores no format: a select value cannot be empty. */
export const AUTOMATIC_FORMAT = 'automatic';

export type DateFormatChoice = WorkspaceDateFormat | typeof AUTOMATIC_FORMAT;

export type NumberFormatChoice = WorkspaceNumberFormat | typeof AUTOMATIC_FORMAT;

export const DATE_FORMAT_CHOICES: ReadonlyArray<DateFormatChoice> = [AUTOMATIC_FORMAT, ...WORKSPACE_DATE_FORMATS];

export const NUMBER_FORMAT_CHOICES: ReadonlyArray<NumberFormatChoice> = [AUTOMATIC_FORMAT, ...WORKSPACE_NUMBER_FORMATS];

export function dateFormatChoiceOf(stored: string | null | undefined): DateFormatChoice {
	return workspaceDateFormatOf(stored) ?? AUTOMATIC_FORMAT;
}

export function numberFormatChoiceOf(stored: string | null | undefined): NumberFormatChoice {
	return workspaceNumberFormatOf(stored) ?? AUTOMATIC_FORMAT;
}

/** The samples are written the same in every language, so any language tag serves. */
const SAMPLE_LANGUAGE = 'en';

const DECEMBER = 11;
const SAMPLE_AMOUNT = 1234.56;

/** The year's last day: a 31 cannot be read as a month, so the sample shows which part is the day. */
export function dateFormatSampleOf(format: WorkspaceDateFormat, year: number): string {
	const locale: WorkspaceLocale = { tag: SAMPLE_LANGUAGE, dateFormat: format, numberFormat: null };
	const sample = dateFormatOf(locale, { year: 'numeric', month: 'numeric', day: 'numeric' });
	return sample.format(new Date(year, DECEMBER, 31));
}

export function numberFormatSampleOf(format: WorkspaceNumberFormat): string {
	const locale: WorkspaceLocale = { tag: SAMPLE_LANGUAGE, dateFormat: null, numberFormat: format };
	const sample = numberFormatOf(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	return sample.format(SAMPLE_AMOUNT);
}

/** The days the week-start row offers, and a day another app stored, so the row still shows what is stored. */
const WEEK_START_DAYS: ReadonlyArray<EWeekDays> = [EWeekDays.MONDAY, EWeekDays.SUNDAY, EWeekDays.SATURDAY];

export function weekStartChoicesOf(stored: EWeekDays | null | undefined): EWeekDays[] {
	if (!stored || WEEK_START_DAYS.includes(stored)) {
		return [...WEEK_START_DAYS];
	}
	return [...WEEK_START_DAYS, stored];
}

/** The day the row shows: Monday for an organization that stores none, as every page then counts from Monday. */
export function weekStartChoiceOf(stored: EWeekDays | null | undefined): EWeekDays {
	return stored ?? EWeekDays.MONDAY;
}

/** Sunday 1 November 2026: each weekday's name is read from this day plus its index. */
const SAMPLE_SUNDAY_DAY = 1;

const WEEKDAY_INDEX: Readonly<Record<EWeekDays, number>> = {
	[EWeekDays.SUNDAY]: 0,
	[EWeekDays.MONDAY]: 1,
	[EWeekDays.TUESDAY]: 2,
	[EWeekDays.WEDNESDAY]: 3,
	[EWeekDays.THURSDAY]: 4,
	[EWeekDays.FRIDAY]: 5,
	[EWeekDays.SATURDAY]: 6
};

export function weekdayNameOf(day: EWeekDays, locale: string): string {
	const sample = new Date(2026, 10, SAMPLE_SUNDAY_DAY + WEEKDAY_INDEX[day]);
	return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(sample);
}

export const CLOCK_CHOICES: ReadonlyArray<WorkspaceClock> = [24, 12];

/** Gauzy gives a new organization the 12-hour clock: the row shows it when nothing else is stored. */
const GAUZY_DEFAULT_CLOCK: WorkspaceClock = 12;

export function clockChoiceOf(stored: unknown): WorkspaceClock {
	return workspaceClockOf(stored) ?? GAUZY_DEFAULT_CLOCK;
}

/** Half past two in the afternoon on each clock: 14:30 or 2:30 PM. */
export function clockSampleOf(clock: WorkspaceClock, locale: string): string {
	const workspace: WorkspaceLocale = { tag: locale, dateFormat: null, numberFormat: null, clock };
	const sample = new Date(2026, 10, 2, 14, 30);
	return dateFormatOf(workspace, { hour: '2-digit', minute: '2-digit' }).format(sample);
}

export const CURRENCY_POSITION_CHOICES: ReadonlyArray<WorkspaceCurrencyPosition> = ['LEFT', 'RIGHT'];

/** Gauzy writes a new organization's currency sign on the left: the row shows it when nothing else is stored. */
const GAUZY_DEFAULT_CURRENCY_POSITION: WorkspaceCurrencyPosition = 'LEFT';

export function currencyPositionChoiceOf(stored: unknown): WorkspaceCurrencyPosition {
	return workspaceCurrencyPositionOf(stored) ?? GAUZY_DEFAULT_CURRENCY_POSITION;
}

/** The currency of the sample while the organization has none yet. */
const SAMPLE_CURRENCY = 'USD';

/** Twelve of the organization's currency with the sign on one side: €12.00 or 12.00 €. */
export function currencyPositionSampleOf(
	position: WorkspaceCurrencyPosition,
	currency: string,
	locale: string
): string {
	const workspace: WorkspaceLocale = {
		tag: locale,
		dateFormat: null,
		numberFormat: null,
		currencyPosition: position
	};
	const shownCurrency = currency || SAMPLE_CURRENCY;
	return numberFormatOf(workspace, { style: 'currency', currency: shownCurrency }).format(12);
}
