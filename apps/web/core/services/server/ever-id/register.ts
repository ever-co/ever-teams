import { NextResponse } from 'next/server';
import { SMTP_PASSWORD, SMTP_USERNAME } from '@/core/constants/config/constants';
import { setAuthCookies } from '@/core/lib/helpers/cookies';
import { everIdSignupAttempts } from '@/core/lib/auth/ever-id/attempts';
import { isEverIdConfigured } from '@/core/lib/auth/ever-id/config';
import {
	clearedEverIdHandoffCookie,
	everIdCookieSecure,
	everIdFlowId,
	everIdHandoffFromRequest
} from '@/core/lib/auth/ever-id/handoff';
import { logEverIdOutcome, type EverIdStepOutcome } from '@/core/lib/auth/ever-id/log';
import {
	createEmployeeFromUser,
	createOrganizationRequest,
	createOrganizationTeamRequest,
	createTenantRequest,
	createTenantSmtpRequest,
	refreshTokenRequest
} from '@/core/services/server/requests';
import { everIdSignupRequest, everIdWorkspaceSigninRequest } from '@/core/services/server/requests/ever-id';
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
 * (`verified_name` is not `true`). Then the register route's usual steps run (tenant, SMTP, organization, employee,
 * team) and the person is signed in.
 */

const SMTP_CONFIGURED = Boolean(SMTP_USERNAME && SMTP_PASSWORD);

const NO_STORE = 'no-store';

/** The account exists (and is linked to the Ever ID) but its workspace is not complete: only support can finish it. */
const SETUP_FAILED = 'Your account was created, but its workspace could not be set up. Please contact support.';

/** The answers of the API that judged the sign-up (an attempt); any other answer gives the attempt back. */
const JUDGED = [200, 400, 403, 410];

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

function errors(status: number, fields: Record<string, string>, extra: Record<string, unknown> = {}): NextResponse {
	return NextResponse.json({ errors: fields, ...extra }, { status, headers: { 'Cache-Control': NO_STORE } });
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

export async function registerWithEverId(req: Request, input: unknown, response: NextResponse): Promise<NextResponse> {
	const body = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
	if (!isEverIdConfigured()) {
		return errors(404, { email: 'Ever ID sign-up is not available.' });
	}
	if (body.ever_id !== 'signup' || !/^application\/json\b/i.test(req.headers.get('content-type') ?? '')) {
		return errors(400, { email: 'This sign-up is not valid. Sign in with Ever ID again.' });
	}
	const secure = everIdCookieSecure(req.headers, req.url);
	/** Answers that end the sign-up with this key also drop its cookie. */
	const withoutKey = (answer: NextResponse) => {
		answer.cookies.set(clearedEverIdHandoffCookie(secure));
		return answer;
	};
	const handoff = everIdHandoffFromRequest(req, 'signup');
	if (!handoff) {
		return errors(410, { email: 'This sign-up has expired. Sign in with Ever ID again.' });
	}
	if (body.ever_id_flow !== everIdFlowId(handoff)) {
		return errors(409, {
			email: 'This sign-up was replaced by another Ever ID sign-in. Sign in with Ever ID again.'
		});
	}
	if (body.confirm !== true) {
		return errors(400, { confirm: 'Confirm that you want to create your workspace with this Ever ID.' });
	}
	const terms = termsClaims(body.terms);
	if (!terms) {
		return errors(400, { confirm: 'Accept the required documents to create your workspace.' });
	}

	const team = text(body.team);
	const startedAt = Date.now();
	const log = (outcome: EverIdStepOutcome, status?: number) =>
		logEverIdOutcome('ever_id.signup', { outcome, latencyMs: Date.now() - startedAt, status });

	const attempt = everIdSignupAttempts.take(handoff);
	if (attempt.verdict === 'exhausted') {
		// Submitted too often with this key: like a used key, the person signs in with Ever ID again.
		log('expired');
		return withoutKey(errors(410, { email: 'This sign-up has expired. Sign in with Ever ID again.' }));
	}
	if (attempt.verdict === 'too_soon') {
		log('throttled');
		return errors(429, { email: 'Too many attempts. Try again in a minute.' });
	}

	let signup;
	try {
		signup = await everIdSignupRequest({
			handoff,
			...(body.verified_name === true ? {} : enteredName(body.name)),
			terms
		});
	} catch {
		attempt.giveBack();
		log('gauzy_error', 0);
		return errors(502, { email: 'The workspace could not be created. Try again later.' });
	}
	// Only an answer about the sign-up itself counts as an attempt (not the API's rate limit or failures).
	if (!JUDGED.includes(signup.status)) attempt.giveBack();

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
	if (signup.status === 200 && !isWorkspacesResponse(signup.data)) {
		// The API took the key (and most likely created the account) but its answer cannot continue the sign-in.
		log('gauzy_error', signup.status);
		return withoutKey(errors(502, { team: SETUP_FAILED }));
	}
	if (signup.status !== 200 || !isWorkspacesResponse(signup.data)) {
		const failure = SIGNUP_FAILURES[signup.status] ?? SIGNUP_FAILURES[502];
		log(failure.outcome, signup.status);
		// An API 410 keeps the cookie: the API also answers 410 while another attempt holds the key.
		return errors(failure.status, failure.errors);
	}

	const created = signup.data;
	const workspace = created.workspaces[0];
	const email = created.confirmed_email || workspace.user.email || '';
	if (!email) {
		// The API created the account but its answer cannot continue the sign-in.
		log('gauzy_error', signup.status);
		return withoutKey(errors(502, { team: SETUP_FAILED }));
	}
	try {
		// Gauzy's unchanged workspace sign-in for the new account (it has no tenant yet).
		const signin = await everIdWorkspaceSigninRequest(email, workspace.token);
		if (signin.status !== 200 || !signin.data?.token || !signin.data.refresh_token) {
			throw new Error(`workspace sign-in answered ${signin.status}`);
		}
		let auth_token = signin.data.token;
		const userId = signin.data.user?.id ?? workspace.user.id;

		// From here on, the same steps as the register route.
		const { data: tenant } = await createTenantRequest(team, auth_token);

		if (SMTP_CONFIGURED) {
			await createTenantSmtpRequest({ access_token: auth_token, tenantId: tenant.id });
		}

		const { data: organization } = await createOrganizationRequest(
			{ currency: 'USD', name: team, tenantId: tenant.id, invitesAllowed: true },
			auth_token
		);

		const { data: employee } = await createEmployeeFromUser(
			{ organizationId: organization.id, startedWorkOn: new Date(), tenantId: tenant.id, userId },
			auth_token
		);

		const { data: createdTeam } = await createOrganizationTeamRequest(
			{
				name: team,
				tenantId: tenant.id,
				organizationId: organization.id,
				managerIds: [employee.id],
				public: true
			},
			auth_token
		);

		const { data: refreshed } = await refreshTokenRequest(signin.data.refresh_token);
		auth_token = refreshed.token;

		setAuthCookies(
			{
				access_token: auth_token,
				refresh_token: { token: refreshed.refresh_token || signin.data.refresh_token },
				timezone: typeof body.timezone === 'string' ? body.timezone : undefined,
				teamId: createdTeam.id,
				tenantId: tenant.id,
				organizationId: organization.id,
				languageId: 'en',
				userId
			},
			{ req, res: response }
		);
	} catch {
		// The account exists and is linked to the Ever ID, but its workspace is not complete; the key is used up.
		log('gauzy_error');
		return withoutKey(errors(502, { team: SETUP_FAILED }));
	}

	log('ok', signup.status);
	response.headers.set('Cache-Control', NO_STORE);
	return withoutKey(response);
}
