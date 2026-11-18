import { IClientTimeReport } from '@ever-teams/toolkit-types';
import { isRecord } from '../client/error-mapping';
import { apiUrlOf, credentialOf, postEmbed } from './embed-request';
import { assertServerOnly } from './server-only';
import { GetClientReportOptions } from './types';

const CALLER = 'getClientReport';

function isClientReport(value: unknown): value is IClientTimeReport {
	if (!isRecord(value)) {
		return false;
	}
	const hasClient = isRecord(value['client']);
	const hasToday = isRecord(value['today']);
	const hasWeek = isRecord(value['week']);
	const hasProjects = Array.isArray(value['projects']);
	return hasClient && hasToday && hasWeek && hasProjects;
}

/**
 * The time spent for the client an embed credential is limited to, on your server: `POST /embed/client-report`.
 * Today, this week, and this week by project, counted in the organization's time zone (`timeZone`).
 *
 * @example
 * const report = await getClientReport({
 * 	apiUrl: process.env.EVER_TEAMS_API_URL,
 * 	credential: process.env.EVER_TEAMS_CLIENT_CREDENTIAL
 * });
 * @throws EverTeamsError with code `CLIENT_OPTIONS` before any request when an option is missing or malformed, and
 * the typed error of each refusal (`EverTeamsForbiddenError` with `EMBED_CLIENT_REQUIRED` or `EMBED_CLIENT_GONE`,
 * `EverTeamsRateLimitError`, `EverTeamsServerError`, ...), each with its `nextStep`. No error holds the credential.
 */
export async function getClientReport(options: GetClientReportOptions): Promise<IClientTimeReport> {
	assertServerOnly();
	const apiUrl = apiUrlOf(CALLER, options.apiUrl);
	const credential = credentialOf(CALLER, options.credential);
	return postEmbed({
		caller: CALLER,
		apiUrl,
		path: '/embed/client-report',
		credential,
		body: { credential },
		fetch: options.fetch,
		isAnswer: isClientReport,
		answerName: 'a client report'
	});
}
