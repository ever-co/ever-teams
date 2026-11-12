import { renameWorkspaceBodySchema } from '@/core/lib/validation/workspace';
import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import {
	WORKSPACE_DATE_FORMATS,
	WORKSPACE_NUMBER_FORMATS,
	dateFormatOf,
	numberFormatOf,
	workspaceDateFormatOf,
	workspaceNumberFormatOf,
	type WorkspaceDateFormat,
	type WorkspaceLocale,
	type WorkspaceNumberFormat
} from '@/core/lib/utils/workspace-formats';
import { ERoleName } from '@/core/types/generics/enums/role';
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
