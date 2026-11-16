import type { TxKeyPath } from '../i18n/i18n';
import { TimerSource } from '../services/interfaces/ITimer';

/** The code of the API's 403 when the organization turned discarding (or deleting time) off. */
const TIMER_DISCARD_DISABLED = 'TIMER_DISCARD_DISABLED';
/** The code of the API's 403 when the run started longer ago than the organization allows. */
const TIMER_DISCARD_TOO_LATE = 'TIMER_DISCARD_TOO_LATE';
/** The code of the API's 409 to the discard of a run the desktop app or the agent records. */
const TIMER_DISCARD_TRACKER_RUN = 'TIMER_DISCARD_TRACKER_RUN';

/** Why the running timer offers no Discard. */
export type TimerDiscardUnavailableReason = 'NOT_RUNNING' | 'NOT_SUPPORTED' | 'DISABLED' | 'TOO_LATE' | 'TRACKER_RUN';

/** Why a discard the person confirmed did not happen. */
export type TimerDiscardFailure =
	| 'NOT_RUNNING'
	| 'DISABLED'
	| 'TOO_LATE'
	| 'FORBIDDEN'
	| 'NOT_SUPPORTED'
	| 'CHANGED'
	| 'TRACKER_RUN'
	| 'OFFLINE'
	| 'GENERIC';

export type TimerDiscardAvailability =
	| { available: true; closesAt: number | null }
	| { available: false; reason: TimerDiscardUnavailableReason };

/** The organization as read; an API without the discard sends neither setting. */
type TDiscardOrganization = {
	allowDiscardTimer?: boolean | null;
	discardTimerWithinMinutes?: number | null;
	[field: string]: unknown;
} | null;

interface ITimerDiscardInput {
	organization: TDiscardOrganization | undefined;
	running: boolean;
	/** Where the running log was started: the desktop app records its own time, which the API never discards. */
	source?: TimerSource | string | null;
	/** The running log's start, in milliseconds; null when the status does not say. */
	startedAt: number | null;
	now: number;
}

/** An answer of the API to a discard: its status, null when the request never reached it, and its code. */
interface IDiscardAnswer {
	status: number | null;
	code?: string;
}

const MS_PER_MINUTE = 60 * 1000;

/** Whether the organization read carries the discard switch: only an API that knows the discard sends it. */
function hasDiscardSettings(
	organization: TDiscardOrganization | undefined
): organization is NonNullable<TDiscardOrganization> {
	if (!organization) {
		return false;
	}
	return Object.prototype.hasOwnProperty.call(organization, 'allowDiscardTimer');
}

/** When the organization's age limit closes the discard of a run started at `startedAt`; null without a limit. */
function closingTimeOf(limitMinutes: number | null | undefined, startedAt: number | null): number | null {
	const hasLimit = typeof limitMinutes === 'number' && limitMinutes > 0;
	if (!hasLimit || startedAt === null) {
		return null;
	}
	return startedAt + limitMinutes * MS_PER_MINUTE;
}

/**
 * Whether the running timer offers Discard, as the API would allow it: a timer runs, it is not the desktop app's, the
 * API knows the discard (its organization read carries the switch), the organization does not turn it off (null
 * counts as allowed), and the run is younger than the organization's limit. `closesAt` is when that limit ends the
 * offer, for the timer to read it again then.
 */
export function timerDiscardAvailabilityOf({
	organization,
	running,
	source,
	startedAt,
	now
}: ITimerDiscardInput): TimerDiscardAvailability {
	if (!running) {
		return { available: false, reason: 'NOT_RUNNING' };
	}
	if (source === TimerSource.DESKTOP) {
		return { available: false, reason: 'TRACKER_RUN' };
	}
	if (!hasDiscardSettings(organization)) {
		return { available: false, reason: 'NOT_SUPPORTED' };
	}
	if (organization.allowDiscardTimer === false) {
		return { available: false, reason: 'DISABLED' };
	}
	const closesAt = closingTimeOf(organization.discardTimerWithinMinutes, startedAt);
	const isTooLate = closesAt !== null && now >= closesAt;
	if (isTooLate) {
		return { available: false, reason: 'TOO_LATE' };
	}
	return { available: true, closesAt };
}

function forbiddenFailureOf(code: string | undefined): TimerDiscardFailure {
	if (code === TIMER_DISCARD_DISABLED) {
		return 'DISABLED';
	}
	if (code === TIMER_DISCARD_TOO_LATE) {
		return 'TOO_LATE';
	}
	return 'FORBIDDEN';
}

/**
 * Reads the API's refusal of a discard: 400 nothing runs, 403 with its code, 404 no such route, 409 another run or
 * a tracker's run. No answer at all is a phone without a connection.
 */
export function timerDiscardFailureOf({ status, code }: IDiscardAnswer): TimerDiscardFailure {
	if (status === null) {
		return 'OFFLINE';
	}
	if (status === 400) {
		return 'NOT_RUNNING';
	}
	if (status === 403) {
		return forbiddenFailureOf(code);
	}
	const routeIsMissing = status === 404 || status === 405;
	if (routeIsMissing) {
		return 'NOT_SUPPORTED';
	}
	if (status === 409) {
		if (code === TIMER_DISCARD_TRACKER_RUN) {
			return 'TRACKER_RUN';
		}
		return 'CHANGED';
	}
	return 'GENERIC';
}

/** The message of each failure of a discard. */
const FAILURE_KEYS: Readonly<Record<TimerDiscardFailure, TxKeyPath>> = {
	NOT_RUNNING: 'timer.discard.failures.notRunning',
	DISABLED: 'timer.discard.failures.disabled',
	TOO_LATE: 'timer.discard.failures.tooLate',
	FORBIDDEN: 'timer.discard.failures.forbidden',
	NOT_SUPPORTED: 'timer.discard.failures.notSupported',
	CHANGED: 'timer.discard.failures.changed',
	TRACKER_RUN: 'timer.discard.failures.trackerRun',
	OFFLINE: 'timer.discard.failures.offline',
	GENERIC: 'timer.discard.failures.generic'
};

/** The message that says why a discard did not happen. */
export function discardFailureKeyOf(failure: TimerDiscardFailure): TxKeyPath {
	return FAILURE_KEYS[failure];
}

/** The web app's own sources: a run started there is named "the web app". */
const WEB_SOURCES: ReadonlySet<string> = new Set([TimerSource.BROWSER, TimerSource.TEAMS]);

/**
 * The name of where a run was started, when it is not this kind of device: a discard stops it there too, so the
 * confirmation says so. Null for a run of the mobile app, or when the status does not say.
 */
export function discardSourceKeyOf(source: TimerSource | string | null | undefined): TxKeyPath | null {
	const isOwnKind = !source || source === TimerSource.MOBILE;
	if (isOwnKind) {
		return null;
	}
	if (WEB_SOURCES.has(source)) {
		return 'timer.discard.sources.web';
	}
	if (source === TimerSource.BROWSER_EXTENSION) {
		return 'timer.discard.sources.browserExtension';
	}
	return 'timer.discard.sources.other';
}
