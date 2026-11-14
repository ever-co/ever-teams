import { ApiErrorService } from '@/core/services/client/api-error.service';

/** The codes of the API's 403 answers to a discard (ever-co/ever-gauzy#11935). */
export const TIMER_DISCARD_DISABLED = 'TIMER_DISCARD_DISABLED';
export const TIMER_DISCARD_TOO_LATE = 'TIMER_DISCARD_TOO_LATE';

/** Why the running timer offers no Discard. */
export type TimerDiscardUnavailableReason = 'NOT_RUNNING' | 'NOT_SUPPORTED' | 'DISABLED' | 'TOO_LATE';

/** Why a discard the API answered was refused or failed. */
export type TimerDiscardFailure =
	| 'NOT_RUNNING'
	| 'DISABLED'
	| 'TOO_LATE'
	| 'FORBIDDEN'
	| 'NOT_SUPPORTED'
	| 'CHANGED'
	| 'GENERIC';

export type TimerDiscardAvailability =
	| { available: true; closesAt: number | null }
	| { available: false; reason: TimerDiscardUnavailableReason };

interface TimerDiscardInput {
	/** The current organization as read; an API without the discard sends neither setting. */
	organization:
		| { allowDiscardTimer?: boolean | null; discardTimerWithinMinutes?: number | null; [field: string]: unknown }
		| null
		| undefined;
	running: boolean;
	/** The running log's start, in milliseconds; null when the status does not say. */
	startedAt: number | null;
	now: number;
}

const MS_PER_MINUTE = 60_000;

function hasDiscardSettings(
	organization: TimerDiscardInput['organization']
): organization is NonNullable<TimerDiscardInput['organization']> {
	if (!organization) {
		return false;
	}
	return Object.hasOwn(organization, 'allowDiscardTimer');
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
 * Whether the running timer offers Discard, as the API would allow it: a timer runs, the API knows the discard (its
 * organization read carries the switch), the organization does not turn it off (null counts as allowed), and the run
 * is younger than the organization's limit. `closesAt` is when that limit ends the offer, for a timer to re-read it.
 */
export function timerDiscardAvailabilityOf({
	organization,
	running,
	startedAt,
	now
}: TimerDiscardInput): TimerDiscardAvailability {
	if (!running) {
		return { available: false, reason: 'NOT_RUNNING' };
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

/** Reads the API's refusal of a discard: 400 nothing runs, 403 with its code, 404 no such route, 409 another run. */
export function timerDiscardFailureOf(error: unknown): TimerDiscardFailure {
	if (!ApiErrorService.isApiError(error)) {
		return 'GENERIC';
	}
	if (error.hasHttpResponseStatus(400)) {
		return 'NOT_RUNNING';
	}
	if (error.hasHttpResponseStatus(403)) {
		return forbiddenFailureOf(error.errorCode);
	}
	if (error.hasHttpResponseStatus(404, 405)) {
		return 'NOT_SUPPORTED';
	}
	if (error.hasHttpResponseStatus(409)) {
		return 'CHANGED';
	}
	return 'GENERIC';
}
