import { NextResponse } from 'next/server';
import { everIdSignupAttempts } from '@/core/lib/auth/ever-id/attempts';
import { isEverIdConfigured } from '@/core/lib/auth/ever-id/config';
import {
	clearedEverIdHandoffCookie,
	everIdCookieSecure,
	everIdFlowId,
	everIdHandoffFromRequest
} from '@/core/lib/auth/ever-id/handoff';
import { everIdLanguage } from '@/core/lib/auth/ever-id/language';
import { logEverIdOutcome, type EverIdStepOutcome } from '@/core/lib/auth/ever-id/log';
import { everIdSignupRequest, retryWhileBusy } from '@/core/services/server/requests/ever-id';
import { provisionEverIdWorkspace } from './provision';
import type { IEverIdTermsClaim, IEverIdWorkspacesResponse } from '@/core/types/interfaces/auth/ever-id';

/**
 * The Ever ID branch of POST /api/auth/register: a person new to the product creates their workspace with
 * the Ever ID they just signed in with.
 *
 * It runs only for a body that carries `ever_id` (without it the register route is unchanged), sent as JSON with
 * `ever_id: 'signup'`, and only once the person ticked the confirmation (`confirm: true`): nothing is created
 * before that. The one-time key comes from the sealed cookie the sign-in set, never from the body, and must be the
 * one whose sign-up the page showed (`ever_id_flow`): another Ever ID sign-in in the same browser since then answers
 * 409 rather than creating the account of an identity the page did not show. The account is
 * created by the Gauzy API from the verified Ever ID (`POST /api/auth/zitadel/signup`, behind its own subscription
 * check), which also links the Ever ID to it; the verified name is used unless the person had to enter one
 * (`verified_name` is not `true`), and the documents accepted are checked in the page's `language`, as the prefill
 * listed them. Then the register route's usual steps run (tenant, SMTP, organization, employee, team: provision.ts)
 * and the person is signed in. While another attempt holds the key the sign-up is tried again after the wait the API
 * asks; still busy, or the API's rate limit, answers 429 with a Retry-After and keeps the key.
 */

const NO_STORE = 'no-store';

/** The account exists and is linked to the Ever ID, but its workspace is not complete: the next sign-in finishes it. */
const SETUP_FAILED =
	'Your account was created, but its workspace could not be set up yet. Sign in with Ever ID again to finish it.';

/** The answers of the API that judged the sign-up (an attempt); any other answer gives the attempt back. */
const JUDGED = new Set([200, 400, 403, 410]);

/** More accepted documents than the API could require is not a sign-up form. */
const MAX_TERMS = 32;

/** What each failed answer of the API's sign-up becomes (anything unlisted is the API's failure, 502). */
const SIGNUP_FAILURES: Record<number, { status: number; outcome: EverIdStepOutcome; errors: Record<string, string> }> =
	{
		400: {
			status: 400,
			outcome: 'invalid',
			errors: { confirm: 'Accept the required documents to create your workspace.' }
		},
		410: {
			status: 410,
			outcome: 'expired',
			errors: { email: 'This sign-up has expired. Sign in with Ever ID again.' }
		},
		429: { status: 429, outcome: 'throttled', errors: { email: 'Too many attempts. Try again in a minute.' } },
		502: {
			status: 502,
			outcome: 'gauzy_error',
			errors: { email: 'The workspace could not be created. Try again later.' }
		}
	};

/** Whether a register body is an Ever ID sign-up (it carries the `ever_id` marker). */
export function isEverIdRegisterBody(body: unknown): boolean {
	return !!body && typeof body === 'object' && 'ever_id' in body;
}

function errors(status: number, fields: Record<string, string>, retryAfterS?: number): NextResponse {
	return NextResponse.json(
		{ errors: fields },
		{
			status,
			headers: { 'Cache-Control': NO_STORE, ...(retryAfterS ? { 'Retry-After': String(retryAfterS) } : {}) }
		}
	);
}

function text(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

/** The accepted documents as the API expects them; `null` when the list is malformed or longer than any form. */
function termsClaims(value: unknown): IEverIdTermsClaim[] | null {
	if (value === undefined) return [];
	if (!Array.isArray(value) || value.length > MAX_TERMS) return null;
	const claims = value
		.filter((claim): claim is Record<string, unknown> => !!claim && typeof claim === 'object')
		.map((claim) => ({
			documentId: text(claim.documentId),
			version: text(claim.version),
			sha256: text(claim.sha256),
			locale: text(claim.locale)
		}))
		.filter((claim) => claim.documentId && claim.version && /^[0-9a-f]{64}$/.test(claim.sha256) && claim.locale);
	return claims.length === value.length ? claims : null;
}

/** The name the person entered, as Gauzy's first and last name (the first word, then the rest). */
function enteredName(value: unknown): { firstName?: string; lastName?: string } {
	const [first, ...rest] = text(value).split(/\s+/).filter(Boolean);
	return { firstName: first || undefined, lastName: rest.join(' ') || undefined };
}

function isHttpsUrl(value: unknown): value is string {
	try {
		return typeof value === 'string' && new URL(value).protocol === 'https:';
	} catch {
		return false;
	}
}

function isWorkspacesResponse(value: unknown): value is IEverIdWorkspacesResponse {
	const response = value as IEverIdWorkspacesResponse;
	return (
		!!response &&
		Array.isArray(response.workspaces) &&
		response.workspaces.length > 0 &&
		typeof response.workspaces[0]?.token === 'string' &&
		!!response.workspaces[0].token &&
		typeof response.workspaces[0]?.user?.id === 'string'
	);
}

type SignupAnswer = Awaited<ReturnType<typeof everIdSignupRequest>>;
type LogOutcome = (outcome: EverIdStepOutcome, status?: number) => void;

/**
 * The checks before the API is called: the answer that ends the request, or the one-time key and the accepted
 * documents the sign-up sends.
 */
function checkSignupRequest(
	req: Request,
	body: Record<string, unknown>
): { answer: NextResponse } | { handoff: string; terms: IEverIdTermsClaim[] } {
	if (body.ever_id !== 'signup' || !/^application\/json\b/i.test(req.headers.get('content-type') ?? '')) {
		return { answer: errors(400, { email: 'This sign-up is not valid. Sign in with Ever ID again.' }) };
	}
	const handoff = everIdHandoffFromRequest(req, 'signup');
	if (!handoff) {
		return { answer: errors(410, { email: 'This sign-up has expired. Sign in with Ever ID again.' }) };
	}
	if (body.ever_id_flow !== everIdFlowId(handoff)) {
		return {
			answer: errors(409, {
				email: 'This sign-up was replaced by another Ever ID sign-in. Sign in with Ever ID again.'
			})
		};
	}
	if (body.confirm !== true) {
		return {
			answer: errors(400, { confirm: 'Confirm that you want to create your workspace with this Ever ID.' })
		};
	}
	const terms = termsClaims(body.terms);
	if (!terms) {
		return { answer: errors(400, { confirm: 'Accept the required documents to create your workspace.' }) };
	}
	return { handoff, terms };
}

/**
 * The answer to an API sign-up answer that does not lead to the workspace setup, or `null` for a complete workspace
 * list. `withoutKey` drops the cookie of a key the API used up.
 */
function answerUnfinishedSignup(
	signup: SignupAnswer,
	log: LogOutcome,
	withoutKey: (answer: NextResponse) => NextResponse
): NextResponse | null {
	const signupData = signup.data as Record<string, unknown> | undefined;
	if (signup.status === 403 && signupData?.code === 'subscription_required' && isHttpsUrl(signupData.checkoutUrl)) {
		// The confirmed sign-up waits in the API while the person goes through checkout; it completes at their
		// next Ever ID sign-in, which starts with a new key.
		log('subscription_required', signup.status);
		return withoutKey(
			NextResponse.json(
				{ checkoutUrl: signupData.checkoutUrl },
				{ status: 403, headers: { 'Cache-Control': NO_STORE } }
			)
		);
	}
	if (signup.status === 200) {
		if (isWorkspacesResponse(signup.data)) return null;
		// The API took the key (and most likely created the account) but its answer cannot continue the sign-in.
		log('gauzy_error', signup.status);
		return withoutKey(errors(502, { team: SETUP_FAILED }));
	}
	if (signup.status === 409 || signup.status === 429) {
		// Still busy after the retries, or the API's rate limit: the key stays valid; try again later.
		log('throttled', signup.status);
		return errors(
			429,
			{ email: 'Too many attempts. Try again in a minute.' },
			signup.retryAfter ?? (signup.status === 409 ? 2 : 60)
		);
	}
	const failure = SIGNUP_FAILURES[signup.status] ?? SIGNUP_FAILURES[502];
	log(failure.outcome, signup.status);
	// A 410 means used up or expired: the cookie goes.
	const answer = errors(failure.status, failure.errors);
	return signup.status === 410 ? withoutKey(answer) : answer;
}

export async function registerWithEverId(req: Request, input: unknown, response: NextResponse): Promise<NextResponse> {
	const body = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
	if (!isEverIdConfigured()) {
		return errors(404, { email: 'Ever ID sign-up is not available.' });
	}
	const checked = checkSignupRequest(req, body);
	if ('answer' in checked) return checked.answer;
	const { handoff, terms } = checked;

	const secure = everIdCookieSecure(req.headers, req.url);
	/** Answers that end the sign-up with this key also drop its cookie. */
	const withoutKey = (answer: NextResponse) => {
		answer.cookies.set(clearedEverIdHandoffCookie(secure));
		return answer;
	};
	const team = text(body.team);
	const startedAt = Date.now();
	const log: LogOutcome = (outcome, status) =>
		logEverIdOutcome('ever_id.signup', { outcome, latencyMs: Date.now() - startedAt, status });

	const attempt = everIdSignupAttempts.take(handoff);
	if (!attempt.allowed) {
		log('throttled');
		return errors(429, { email: 'Too many attempts. Try again in a minute.' }, attempt.retryAfterS);
	}

	const language = everIdLanguage(body.language);
	let signup: SignupAnswer;
	try {
		signup = await retryWhileBusy(() =>
			everIdSignupRequest(
				{ handoff, ...(body.verified_name === true ? {} : enteredName(body.name)), terms },
				language
			)
		);
	} catch {
		attempt.giveBack();
		log('gauzy_error', 0);
		return errors(502, { email: 'The workspace could not be created. Try again later.' });
	}
	// Only an answer about the sign-up itself counts as an attempt (not the API's rate limit or failures).
	if (!JUDGED.has(signup.status)) attempt.giveBack();

	const unfinished = answerUnfinishedSignup(signup, log, withoutKey);
	if (unfinished || !isWorkspacesResponse(signup.data)) {
		return unfinished ?? withoutKey(errors(502, { team: SETUP_FAILED }));
	}

	const created = signup.data;
	const workspace = created.workspaces[0];
	const email = created.confirmed_email || workspace.user.email || '';
	if (!email) {
		// The API created the account but its answer cannot continue the sign-in.
		log('gauzy_error', signup.status);
		return withoutKey(errors(502, { team: SETUP_FAILED }));
	}
	// The new account has no tenant yet: Gauzy's workspace sign-in, then the register route's usual steps.
	const setup = await provisionEverIdWorkspace({
		req,
		response,
		email,
		workspaceToken: workspace.token,
		fallbackUserId: workspace.user.id,
		team,
		timezone: typeof body.timezone === 'string' ? body.timezone : undefined
	});
	if (setup !== 'ok') {
		// The account exists and is linked to the Ever ID, but its workspace is not complete; the key is used up.
		log('gauzy_error');
		return withoutKey(errors(502, { team: SETUP_FAILED }));
	}

	log('ok', signup.status);
	response.headers.set('Cache-Control', NO_STORE);
	return withoutKey(response);
}
