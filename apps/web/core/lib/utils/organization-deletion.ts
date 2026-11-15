import { errorReasonKeyOf, errorStatusOf, gauzyErrorCodeOf } from '@/core/lib/utils/error-feedback';

/** Gauzy guards the organization routes, its delete and its counts included, with this permission. */
const ORGANIZATION_DELETE_PERMISSION = 'ALL_ORG_EDIT';

/** The permissions the app's own routes ask before forwarding a deletion or its counts. */
export const ORGANIZATION_DELETE_PERMISSIONS: readonly string[] = Object.freeze([ORGANIZATION_DELETE_PERMISSION]);

/** Gauzy's code when the organization is the last live one of its workspace (ever-co/ever-gauzy#11970). */
const LAST_OF_WORKSPACE_CODE = 'ORGANIZATION_LAST_OF_WORKSPACE';

/** Why an organization cannot be deleted from its settings. */
export type OrganizationDeletionBlock = 'lastOrganization' | 'timerRunning';

/** Why the counts the confirmation shows did not come: an API without them, or a failure a new try may fix. */
export type OrganizationCountsFailure = 'unsupported' | 'failed';

export interface DeletableOrganization {
	id: string;
	name: string;
}

export function canDeleteOrganization(permissions: ReadonlyArray<string>): boolean {
	return permissions.includes(ORGANIZATION_DELETE_PERMISSION);
}

/**
 * The last organization of a workspace stays, as Gauzy refuses it: removing it would leave the workspace with nowhere
 * to sign in to, and only an account deletion removes a workspace. Counted over the whole workspace, since an admin
 * may delete an organization while other ones they are not a member of remain (null until it is read).
 *
 * The person's own timer holds the delete while it runs or starts, as it holds the team menu's switch: Gauzy leaves a
 * running time log of the deleted organization running, where no page can stop it any more.
 */
export function organizationDeletionBlock(
	workspaceOrganizationCount: number | null,
	isTimerOn: boolean
): OrganizationDeletionBlock | null {
	if (workspaceOrganizationCount !== null && workspaceOrganizationCount <= 1) {
		return 'lastOrganization';
	}
	if (isTimerOn) {
		return 'timerRunning';
	}
	return null;
}

/**
 * Where the person goes once the organization is deleted: another of their organizations of the workspace, the first
 * by name so the choice does not depend on the order the API listed them in, or null for the workspace picker.
 */
export function organizationToLandInAfterDeletion(
	organizations: ReadonlyArray<DeletableOrganization>,
	deletedId: string
): DeletableOrganization | null {
	const others = organizations.filter((organization) => organization.id !== deletedId);
	const byName = [...others].sort((first, second) => first.name.localeCompare(second.name));
	return byName[0] ?? null;
}

function messageOf(error: unknown): string {
	if (typeof error !== 'object' || error === null) {
		return '';
	}
	const response = (error as { response?: { data?: { message?: unknown } } }).response;
	const message = response?.data?.message ?? (error as { message?: unknown }).message;
	return typeof message === 'string' ? message : '';
}

/**
 * An API older than the counts answers their route with Nest's own 404 ("Cannot GET ..."). Its soft delete only marks
 * the organization row and leaves its teams in sign-in, so nothing is offered against it. Any other failure, the 404 of
 * an organization another admin just deleted included, is one a new try may fix.
 */
export function countsFailureOf(error: unknown): OrganizationCountsFailure {
	const isRouteMissing = errorStatusOf(error) === 404 && messageOf(error).startsWith('Cannot GET');
	if (isRouteMissing) {
		return 'unsupported';
	}
	return 'failed';
}

/** What the confirmation can show: the counts are loading, failed, missing from an older API, or ready. */
export type OrganizationDeletionStatus = 'loading' | OrganizationCountsFailure | 'ready';

export interface OrganizationDeletionReads {
	/** The counts and the workspace's organizations, read each time the confirmation opens. */
	isFetching: boolean;
	isError: boolean;
	error: unknown;
	isSuccess: boolean;
	/** The person's organizations, which decide where they land, read again each time the confirmation opens. */
	isMenuFetching: boolean;
	isMenuError: boolean;
	isMenuSuccess: boolean;
}

/**
 * Loading while the counts are read, even again: the counts of an earlier opening may be out of date, and the delete
 * stays off until the fresh ones are in.
 */
export function organizationDeletionStatusOf(reads: OrganizationDeletionReads): OrganizationDeletionStatus {
	if (reads.isFetching || reads.isMenuFetching) {
		return 'loading';
	}
	if (reads.isError) {
		return countsFailureOf(reads.error);
	}
	if (reads.isMenuError) {
		return 'failed';
	}
	if (reads.isSuccess && reads.isMenuSuccess) {
		return 'ready';
	}
	return 'loading';
}

/** What a failed delete says: the refusal of the workspace's last organization has its own reason. */
export function deletionErrorKeyOf(error: unknown): string {
	if (gauzyErrorCodeOf(error) === LAST_OF_WORKSPACE_CODE) {
		return 'settings.workspace.deletion.LAST_ORGANIZATION_REFUSED';
	}
	return errorReasonKeyOf(error);
}

/** Tracked time in hours, one decimal, for the confirmation. */
export function trackedHoursOf(trackedSeconds: number): number {
	return Math.round(trackedSeconds / 360) / 10;
}

export interface OrganizationDeletionSteps {
	softDelete: () => Promise<void>;
	renewSession: () => Promise<void>;
	openOrganization: (organizationId: string) => Promise<void>;
	openWorkspacePicker: () => Promise<void> | void;
}

/**
 * Deletes the organization, then opens the one to land in. Gauzy refuses the session's token from the delete on, as
 * it names the deleted organization, so the session is renewed first: the renewed token names the organization Gauzy
 * moved the person to. A failed delete changes nothing and is the caller's to show. Once the organization is gone,
 * a failure to renew the session or open the next one signs the person out to pick a workspace again: a restart
 * would start from the organization and team cookies, which still name the deleted organization.
 */
export async function deleteOrganizationAndLand(
	landing: DeletableOrganization | null,
	steps: OrganizationDeletionSteps
): Promise<void> {
	await steps.softDelete();
	if (!landing) {
		await steps.openWorkspacePicker();
		return;
	}
	try {
		await steps.renewSession();
		await steps.openOrganization(landing.id);
	} catch {
		await steps.openWorkspacePicker();
	}
}
