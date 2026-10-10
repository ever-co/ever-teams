/**
 * Structured outcome lines of the Ever Platform features. They carry machine tokens only: never a
 * payload, an id, a key, a token or a URL.
 */

export type SendOutcome =
	| 'sent'
	| 'rejected'
	| 'failed'
	| 'skipped_gauzy_off'
	| 'skipped_gauzy_unpaired'
	| 'skipped_gauzy_unreachable'
	| 'skipped_invalid';

/** `ever_stats.send outcome=<outcome> status=<n|-> final=<bool>` */
export function logSendOutcome(outcome: SendOutcome, status: number | null, final: boolean): void {
	console.info(`ever_stats.send outcome=${outcome} status=${status ?? '-'} final=${final}`);
}

/** `ever_stats.reporter state=<state>` (start, off and pause reasons). */
export function logReporterState(state: string): void {
	console.info(`ever_stats.reporter state=${state}`);
}

/** `ever_platform.proxy path_class=<id> status=<n>` */
export function logProxyOutcome(pathClass: string, status: number): void {
	console.info(`ever_platform.proxy path_class=${pathClass} status=${status}`);
}
