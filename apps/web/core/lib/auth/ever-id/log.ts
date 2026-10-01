/**
 * One structured log line per Ever ID outcome, for the rollout dashboards and alerts.
 *
 * The payload is built from an allow-list of fields: the event, its outcome, the latency, the HTTP status
 * involved and the replica. Never a token, a subject, a session id, an e-mail address or a tenant id: the
 * signature below accepts nothing else, and the test of this module pins the keys.
 */

export type EverIdLogEvent = 'ever_id.signin' | 'ever_id.backchannel' | 'ever_id.confirm' | 'ever_id.signup';

export type EverIdSignInOutcome =
	| 'ok'
	| 'no_workspace'
	| 'blocked'
	| 'confirm_required'
	| 'signup_required'
	| 'rejected'
	| 'gauzy_error';

export type EverIdBackchannelOutcome = 'ok' | 'invalid' | 'replay' | 'stale' | 'forward_failed';

export type EverIdStepOutcome = 'ok' | 'invalid' | 'expired' | 'subscription_required' | 'throttled' | 'gauzy_error';

export interface EverIdLogFields {
	outcome: EverIdSignInOutcome | EverIdBackchannelOutcome | EverIdStepOutcome;
	/** Milliseconds the step took. */
	latencyMs?: number;
	/** The HTTP status the Gauzy API answered (0 when it could not be reached). */
	status?: number;
}

export interface EverIdLogPayload {
	event: EverIdLogEvent;
	outcome: string;
	latency_ms?: number;
	status?: number;
	replica?: string;
}

/** The exact object that is logged. */
export function everIdLogPayload(event: EverIdLogEvent, fields: EverIdLogFields): EverIdLogPayload {
	const payload: EverIdLogPayload = { event, outcome: fields.outcome };
	if (typeof fields.latencyMs === 'number' && Number.isFinite(fields.latencyMs)) {
		payload.latency_ms = Math.max(0, Math.round(fields.latencyMs));
	}
	if (typeof fields.status === 'number' && Number.isFinite(fields.status)) {
		payload.status = fields.status;
	}
	const replica = process.env.HOSTNAME?.trim();
	if (replica) payload.replica = replica;
	return payload;
}

/** A logfmt value: the fields are fixed words, numbers and a pod name, so only stray spaces need escaping. */
function logfmtValue(value: string | number): string {
	return String(value).replace(/[\s"=]+/g, '_');
}

/** The logged line, `ever_id.signin outcome=ok latency_ms=120 status=200 replica=…` (logfmt). */
export function everIdLogLine(payload: EverIdLogPayload): string {
	const { event, ...fields } = payload;
	const pairs = Object.entries(fields)
		.filter(([, value]) => value !== undefined)
		.map(([key, value]) => `${key}=${logfmtValue(value as string | number)}`);
	return [event, ...pairs].join(' ');
}

/** Logs one outcome line; log queries filter on the event name and `outcome=`. */
export function logEverIdOutcome(event: EverIdLogEvent, fields: EverIdLogFields): void {
	const payload = everIdLogPayload(event, fields);
	const line = everIdLogLine(payload);
	if (payload.outcome === 'ok') {
		console.info(line);
	} else {
		console.warn(line);
	}
}
