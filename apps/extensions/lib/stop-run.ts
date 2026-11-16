import { ApiError } from '~lib/api-client';
import { stopTimer, type RunningLog } from '~lib/gauzy';
import type { ApiFailure } from '~lib/refusal';
import type { Session } from '~lib/workspaces';
import browser from '~misc/browser';
import { MessageTypesToBackgroundEnum } from '~typescript/enums/MessageTypesEnum';
import type { IPostMessage } from '~typescript/interfaces/PostMessage';

/**
 * A stop pressed in the popup goes through the background (background.ts): it credits the run's last seconds and
 * stops it in the same turn as its own reads and heartbeats. The popup used to credit those seconds itself, beside the
 * background's alarm: when both read the run within the same few hundred milliseconds, before either heartbeat
 * landed, both credited the seconds since its last heartbeat, and Gauzy counted them twice.
 */

/** The run a stop names: the stop sends its id and its source. */
export type RunToStop = Pick<RunningLog, 'id' | 'source'>;

/** The background's answer to a stop: stopped, or else the failure the popup shows (none when not the API's). */
export interface StopRunAnswer {
	stopped: boolean;
	failure?: ApiFailure;
}

/** What a failed stop keeps for the popup, across the message: the API's answer, or nothing when it was not one. */
export function stopFailureOf(error: unknown): StopRunAnswer {
	if (!(error instanceof ApiError)) {
		return { stopped: false };
	}
	const failure: ApiFailure = { status: error.status, message: error.message };
	if (error.code) {
		failure.code = error.code;
	}
	if (error.details) {
		failure.details = error.details;
	}
	return { stopped: false, failure };
}

function isStopRunAnswer(answer: unknown): answer is StopRunAnswer {
	return typeof (answer as { stopped?: unknown } | null)?.stopped === 'boolean';
}

/** The stop the popup asks for, as the background receives it; null for any other message. */
export function runToStopOf(message: unknown): RunToStop | null {
	const { type, payload } = (message ?? {}) as IPostMessage<Partial<RunToStop> | undefined>;
	if (type !== MessageTypesToBackgroundEnum.stopRun || typeof payload?.id !== 'string' || !payload.id) {
		return null;
	}
	return { id: payload.id, source: typeof payload.source === 'string' ? payload.source : null };
}

/** Asks the background to stop the run; null when it could not be reached or gave no answer. */
async function askBackgroundToStop(run: RunToStop): Promise<StopRunAnswer | null> {
	const message: IPostMessage<RunToStop> = {
		type: MessageTypesToBackgroundEnum.stopRun,
		payload: { id: run.id, source: run.source ?? null }
	};
	try {
		const answer: unknown = await browser.runtime.sendMessage(message);
		return isStopRunAnswer(answer) ? answer : null;
	} catch {
		return null;
	}
}

/**
 * Stops the run through the background, which credits its last seconds first. A failure the API answered is thrown
 * as the API's, so the popup shows its reason. A popup that cannot reach the background stops the run itself, without
 * crediting its last seconds: the alarm's heartbeat may be crediting them, and losing them beats counting them twice.
 */
export async function stopThroughBackground(session: Session, run: RunToStop): Promise<void> {
	const answer = await askBackgroundToStop(run);
	if (!answer) {
		await stopTimer(session, run);
		return;
	}
	if (answer.stopped) {
		return;
	}
	const failure = answer.failure;
	if (!failure) {
		throw new Error('The run could not be stopped');
	}
	throw new ApiError(
		failure.status,
		failure.message ?? `HTTP ${failure.status}`,
		failure.code,
		failure.details?.fields
	);
}
