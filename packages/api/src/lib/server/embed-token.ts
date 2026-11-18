import { isRecord } from '../client/error-mapping';
import { apiUrlOf, credentialOf, isFilled, isWebAddress, optionsError, postEmbed } from './embed-request';
import { EverTeamsEmbedToken, ExchangeEmbedTokenOptions } from './types';

const CALLER = 'exchangeEmbedToken';

const PERSON_STEP =
	'Pass the email of the person signed in to your product, as their Ever Teams account has it, or their employeeId ' +
	"in the credential's organization.";

const ORIGIN_STEP =
	'Pass the origin of the page the timer runs in: a scheme, a host and an optional port (https://app.example.com), ' +
	'one of the sites the organization allows in Settings > Embeds of the web app. The token works only from it.';

type Person = { email: string } | { employeeId: string };

function personOf({ email, employeeId }: ExchangeEmbedTokenOptions): Person {
	const hasEmail = isFilled(email);
	const hasEmployeeId = isFilled(employeeId);
	if (hasEmail && hasEmployeeId) {
		throw optionsError(`${CALLER} takes email or employeeId, not both.`, PERSON_STEP);
	}
	if (hasEmail) {
		return { email };
	}
	if (hasEmployeeId) {
		return { employeeId };
	}
	throw optionsError(`${CALLER} needs the person to sign in: email or employeeId.`, PERSON_STEP);
}

// A site as a browser names it: a scheme, a host and an optional port, with at most one trailing slash.
function isOrigin(value: string): boolean {
	const schemeEnd = value.indexOf('://');
	if (schemeEnd <= 0) {
		return false;
	}
	const authority = value.slice(schemeEnd + 3).replace(/\/$/, '');
	const hasOnlyAuthority = authority.length > 0 && !/[/?#@\\*]/.test(authority);
	if (!hasOnlyAuthority) {
		return false;
	}
	return isWebAddress(value);
}

function originOf(origin: unknown): string {
	if (!isFilled(origin)) {
		throw optionsError(`${CALLER} needs origin, the site of the page the timer runs in.`, ORIGIN_STEP);
	}
	const site = origin.trim();
	if (!isOrigin(site)) {
		throw optionsError(`${CALLER} needs origin as a site, with no path: https://app.example.com.`, ORIGIN_STEP);
	}
	return site;
}

// An API without the names (before ever-co/ever-gauzy#12084) is never sent them unless they are given.
function namesOf({ firstName, lastName }: ExchangeEmbedTokenOptions): { [field: string]: string } {
	const names: { [field: string]: string } = {};
	if (isFilled(firstName)) {
		names['firstName'] = firstName;
	}
	if (isFilled(lastName)) {
		names['lastName'] = lastName;
	}
	return names;
}

function isEmbedToken(value: unknown): value is EverTeamsEmbedToken {
	if (!isRecord(value)) {
		return false;
	}
	const hasToken = isFilled(value['token']);
	const hasExpiry = typeof value['expiresAt'] === 'string';
	return hasToken && hasExpiry;
}

/**
 * Exchanges an embed credential for a short-lived token for one person, on your server: `POST /embed/token`. The
 * token reaches only that person's timer, from the page's origin; hand it to the page, never the credential.
 *
 * @example
 * const { token, expiresAt } = await exchangeEmbedToken({
 * 	apiUrl: process.env.EVER_TEAMS_API_URL,
 * 	credential: process.env.EVER_TEAMS_EMBED_CREDENTIAL,
 * 	email: user.email,
 * 	origin: 'https://app.example.com'
 * });
 * @throws EverTeamsError with code `CLIENT_OPTIONS` before any request when an option is missing or malformed, and
 * the typed error of each refusal (`EverTeamsForbiddenError` with `EMBED_MEMBER_NOT_ALLOWED` or
 * `EMBED_ORIGIN_NOT_ALLOWED`, `EverTeamsRateLimitError`, ...), each with its `nextStep`. No error holds the credential.
 */
export async function exchangeEmbedToken(options: ExchangeEmbedTokenOptions): Promise<EverTeamsEmbedToken> {
	const apiUrl = apiUrlOf(CALLER, options.apiUrl);
	const credential = credentialOf(CALLER, options.credential);
	const person = personOf(options);
	const origin = originOf(options.origin);
	const answer = await postEmbed({
		caller: CALLER,
		apiUrl,
		path: '/embed/token',
		credential,
		body: { credential, ...person, origin, ...namesOf(options) },
		fetch: options.fetch,
		isAnswer: isEmbedToken,
		answerName: 'a token'
	});
	return { token: answer.token, expiresAt: answer.expiresAt };
}
