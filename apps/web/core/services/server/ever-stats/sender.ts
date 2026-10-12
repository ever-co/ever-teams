import { CONSTANTS, SDK_VERSION, sendStatsReport, signStatsReport, StatsValidationError } from '@ever-co/connect-sdk';
import type { ReadyStatsIdentity } from './instance';
import { logSendOutcome } from '../ever-platform/log';
import type { TeamsStatsReport } from './report';
import { recordAttempt } from './state';

/**
 * Signs one report and posts it, with the Ever Platform SDK only: the SDK runs the platform's own
 * checks on the exact bytes, signs exactly those bytes (`Ever-Stats-Key`, `Ever-Stats-Signature`,
 * `Ever-Stats-Key-Id`) and posts them to `<base>/v1/stats/reports` with no credential, no cookie and
 * no redirect, within the write timeout. The bytes sent are the bytes kept for the operator's view.
 */

export type SendResult =
	| { readonly kind: 'sent'; readonly status: 202 }
	/** No answer, 429 or 5xx: try again later. */
	| { readonly kind: 'failed'; readonly status: number | null; readonly retryAfterS: number }
	/** Refused for good (or `409 key_mismatch`: the id belongs to another key). */
	| { readonly kind: 'rejected'; readonly status: number; readonly keyMismatch: boolean }
	/** The checks refused the report: nothing was sent. */
	| { readonly kind: 'invalid' };

export interface SendOptions {
	readonly baseUrl: string;
	readonly now: Date;
	readonly fetch?: typeof globalThis.fetch;
	/** Failed sends before this one (picks the wait of a retry). */
	readonly attempt?: number;
}

function describeResult(result: Exclude<SendResult, { kind: 'invalid' }>): {
	outcome: 'sent' | 'rejected' | 'failed';
	httpStatus: number | null;
} {
	if (result.kind === 'sent') return { outcome: 'sent', httpStatus: result.status };
	if (result.kind === 'rejected') return { outcome: 'rejected', httpStatus: result.status };
	return { outcome: 'failed', httpStatus: result.status };
}

export async function sendTeamsReport(
	report: TeamsStatsReport,
	identity: ReadyStatsIdentity,
	options: SendOptions
): Promise<SendResult> {
	let signed: ReturnType<typeof signStatsReport>;
	try {
		signed = signStatsReport(report, identity.signer, { keyId: true });
	} catch (error) {
		if (error instanceof StatsValidationError) {
			// Field codes only: the error never repeats a value of the report.
			console.warn(`ever_stats: stats_build_invalid status=${error.status} code=${error.code}`);
			logSendOutcome('skipped_invalid', null, report.final);
			return { kind: 'invalid' };
		}
		throw error;
	}

	const outcome = await sendStatsReport(signed, {
		baseUrl: options.baseUrl,
		fetch: options.fetch,
		timeoutMs: CONSTANTS.timeouts_ms.write,
		attempt: options.attempt ?? 0,
		userAgent: `ever-connect-sdk/${SDK_VERSION} (teams/${report.version})`
	});

	let result: Exclude<SendResult, { kind: 'invalid' }>;
	switch (outcome.kind) {
		case 'accepted':
			result = { kind: 'sent', status: 202 };
			break;
		case 'retry':
			result = { kind: 'failed', status: outcome.status, retryAfterS: outcome.retryAfterS };
			break;
		case 'reset_identity':
			result = { kind: 'rejected', status: outcome.status, keyMismatch: true };
			break;
		default:
			result = { kind: 'rejected', status: outcome.status, keyMismatch: false };
	}

	const { outcome: attemptOutcome, httpStatus } = describeResult(result);
	recordAttempt({
		payload: Buffer.from(signed.body).toString('utf8'),
		sent_at: options.now.toISOString(),
		http_status: httpStatus,
		outcome: attemptOutcome,
		period: report.period,
		final: report.final
	});
	logSendOutcome(attemptOutcome, httpStatus, report.final);
	return result;
}
