import { errorReasonKeyOf, errorStatusOf, gauzyErrorCodeOf } from '@/core/lib/utils/error-feedback';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';

/** Gauzy guards the organization routes, its delete and its counts included, with this permission. */
const ORGANIZATION_DELETE_PERMISSION = 'ALL_ORG_EDIT';

/** The permissions the app's own routes ask before forwarding a deletion or its counts. */
export const ORGANIZATION_DELETE_PERMISSIONS: readonly string[] = Object.freeze([ORGANIZATION_DELETE_PERMISSION]);

/** Gauzy's code when the organization is the last live one of its workspace (ever-co/ever-gauzy#11970). */
const LAST_OF_WORKSPACE_CODE = 'ORGANIZATION_LAST_OF_WORKSPACE';

/** Why an organization cannot be deleted from its settings. */
export type OrganizationDeletionBlock = 'lastOrganization' | 'timerRunning';

/** Why the counts the confirmation shows did not come: an API without them, or a failure a new try may fix. */
type OrganizationCountsFailure = 'unsupported' | 'failed';

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

interface OrganizationDeletionReads {
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

/** The person's own run, found going on by the read the delete makes first. */
class RunGoingOnError extends Error {
	constructor() {
		super('A timer or a break of the person goes on in the organization');
		this.name = 'RunGoingOnError';
	}
}

/** The reads that tell whether a run of the person goes on in the organization, made afresh. */
interface RunReads {
	/** The day's status. During a break Gauzy answers `running: false`, with the break as its last log, still running. */
	readStatus: () => Promise<Pick<ITimerStatus, 'running' | 'lastLog'> | null | undefined>;
	/** The person's last log of any day: the day's status leaves out a run started before midnight. */
	readLastLog: () => Promise<Pick<ITimeLog, 'isRunning'> | null | undefined>;
}

/**
 * Whether a run of the person goes on, work or a break, read afresh as the timer reads a run before a start: the day's
 * status first, then the last log of any day. This tab's own timer state misses a break (its running flag is off) and
 * a run started before midnight on a page opened since, both of which Gauzy would leave running in the deleted
 * organization, where no page can stop them any more.
 */
export async function isRunGoingOn(reads: RunReads): Promise<boolean> {
	const status = await reads.readStatus();
	if (status?.running || status?.lastLog?.isRunning) {
		return true;
	}
	const lastLog = await reads.readLastLog();
	return lastLog?.isRunning === true;
}

/** What a failed delete says: the refusal of the workspace's last organization, and a run going on, have their own. */
export function deletionErrorKeyOf(error: unknown): string {
	if (error instanceof RunGoingOnError) {
		return 'settings.workspace.deletion.TIMER_RUNNING';
	}
	if (gauzyErrorCodeOf(error) === LAST_OF_WORKSPACE_CODE) {
		return 'settings.workspace.deletion.LAST_ORGANIZATION_REFUSED';
	}
	return errorReasonKeyOf(error);
}

/** Tracked time in hours, one decimal, for the confirmation. */
export function trackedHoursOf(trackedSeconds: number): number {
	return Math.round(trackedSeconds / 360) / 10;
}

interface OrganizationDeletionSteps {
	/** Read afresh right before the delete: a run started since the confirmation opened holds it too. */
	isRunGoingOn: () => Promise<boolean>;
	softDelete: () => Promise<void>;
	renewSession: () => Promise<void>;
	openOrganization: (organizationId: string) => Promise<void>;
	openWorkspacePicker: () => Promise<void> | void;
}

/**
 * Deletes the organization, then opens the one to land in. Gauzy refuses the session's token from the delete on, as
 * it names the deleted organization, so the session is renewed first: the renewed token names the organization Gauzy
 * moved the person to. A failed delete changes nothing and is the caller's to show, and so does a run of the person
 * still going on, read first: the delete is not sent then.
 *
 * Once the organization is gone, a failed renewal or switch sends the person to sign in, where they pick a workspace.
 * Restarting the app instead would keep the deleted organization in the session's cookies, with a token Gauzy refuses
 * (the renewal failed) or one naming another organization than the cookies (the switch failed).
 */
export async function deleteOrganizationAndLand(
	landing: DeletableOrganization | null,
	steps: OrganizationDeletionSteps
): Promise<void> {
	if (await steps.isRunGoingOn()) {
		throw new RunGoingOnError();
	}
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
