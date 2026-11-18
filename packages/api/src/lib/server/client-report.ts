import { IClientTimeReport } from '@ever-teams/toolkit-types';
import { isRecord } from '../client/error-mapping';
import { apiUrlOf, credentialOf, postEmbed } from './embed-request';
import { assertServerOnly } from './server-only';
import { GetClientReportOptions } from './types';

const CALLER = 'getClientReport';

const isText = (value: unknown): value is string => typeof value === 'string';
const isSeconds = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const isProject = (value: unknown): boolean =>
	isRecord(value) && isText(value['id']) && isText(value['name']) && isSeconds(value['seconds']);

// Every field the report widget reads, with its type: the widget refuses a report that lacks one, so the helper does.
function isClientReport(value: unknown): value is IClientTimeReport {
	if (!isRecord(value)) {
		return false;
	}
	const { client, today, week, projects } = value;
	if (!isRecord(client) || !isRecord(today) || !isRecord(week) || !Array.isArray(projects)) {
		return false;
	}
	const hasClient = isText(client['id']) && isText(client['name']);
	const hasToday = isText(today['date']) && isSeconds(today['seconds']);
	const hasWeek = isText(week['start']) && isText(week['end']) && isSeconds(week['seconds']);
	return hasClient && isText(value['timeZone']) && hasToday && hasWeek && projects.every(isProject);
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
