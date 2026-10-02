/**
 * One structured log line per Ever ID outcome, for the rollout dashboards and alerts.
 *
 * The line is built from an allow-list of fields: the event, its outcome, the latency, the HTTP status
 * involved and the replica. Never a token, a subject, a session id, an e-mail address or a tenant id: the
 * signatures below accept nothing else, the line is written field by field, and the test of this module pins it.
 */

/** The outcomes of each event. */
interface EverIdOutcomes {
	'ever_id.signin':
		| 'ok'
		| 'no_workspace'
		| 'blocked'
		| 'confirm_required'
		| 'signup_required'
		| 'rejected'
		| 'gauzy_error';
	'ever_id.backchannel': 'ok' | 'invalid' | 'replay' | 'stale' | 'unavailable' | 'forward_failed';
	'ever_id.confirm': EverIdStepOutcome;
	'ever_id.signup': EverIdStepOutcome;
}

type EverIdLogEvent = keyof EverIdOutcomes;

export type EverIdSignInOutcome = EverIdOutcomes['ever_id.signin'];

export type EverIdStepOutcome = 'ok' | 'invalid' | 'expired' | 'subscription_required' | 'throttled' | 'gauzy_error';

interface EverIdLogFields<E extends EverIdLogEvent> {
	outcome: EverIdOutcomes[E];
	/** Milliseconds the step took. */
	latencyMs?: number;
	/** The HTTP status the Gauzy API answered (0 when it could not be reached). */
	status?: number;
}

interface EverIdLogPayload {
	event: EverIdLogEvent;
	outcome: string;
	latency_ms?: number;
	status?: number;
	replica?: string;
}

/**
 * The outcomes that need attention (logged as warnings). The others are a person's normal way through the flow
 * (a link that needs the e-mail code, a new person, a wrong code, an old link) and are logged as information.
 */
const WARNINGS: { [E in EverIdLogEvent]: ReadonlySet<EverIdOutcomes[E]> } = {
	'ever_id.signin': new Set(['rejected', 'gauzy_error']),
	'ever_id.backchannel': new Set(['invalid', 'replay', 'stale', 'unavailable', 'forward_failed']),
	'ever_id.confirm': new Set(['throttled', 'gauzy_error']),
	'ever_id.signup': new Set(['throttled', 'gauzy_error'])
};

/** The exact object that is logged. */
export function everIdLogPayload<E extends EverIdLogEvent>(event: E, fields: EverIdLogFields<E>): EverIdLogPayload {
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

/** The logged line, `ever_id.signin outcome=ok latency_ms=120 status=200 replica=…` (logfmt, listed fields only). */
export function everIdLogLine(payload: EverIdLogPayload): string {
	const parts = [payload.event, `outcome=${logfmtValue(payload.outcome)}`];
	if (payload.latency_ms !== undefined) parts.push(`latency_ms=${logfmtValue(payload.latency_ms)}`);
	if (payload.status !== undefined) parts.push(`status=${logfmtValue(payload.status)}`);
	if (payload.replica !== undefined) parts.push(`replica=${logfmtValue(payload.replica)}`);
	return parts.join(' ');
}

/** Logs one outcome line; log queries filter on the event name and `outcome=`. */
export function logEverIdOutcome<E extends EverIdLogEvent>(event: E, fields: EverIdLogFields<E>): void {
	const line = everIdLogLine(everIdLogPayload(event, fields));
	if ((WARNINGS[event] as ReadonlySet<string>).has(fields.outcome)) {
		console.warn(line);
	} else {
		console.info(line);
	}
}
