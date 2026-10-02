import { cookies, headers } from 'next/headers';
import { getEverIdConfig } from '@/core/lib/auth/ever-id/config';
import {
	everIdHandoffCookie,
	isHttpsRequest,
	readEverIdHandoff,
	sealEverIdHandoff
} from '@/core/lib/auth/ever-id/handoff';
import { logEverIdOutcome, type EverIdSignInOutcome } from '@/core/lib/auth/ever-id/log';
import { everIdStepPath, type EverIdStep } from '@/core/lib/auth/ever-id/step';
import { signWithEverIdRequest, type EverIdApiResult } from '@/core/services/server/requests/ever-id';
import type {
	IEverIdSessionData,
	IEverIdTokenNotFound,
	IEverIdTokenResponse,
	IEverIdWorkspace,
	IEverIdWorkspacesResponse
} from '@/core/types/interfaces/auth/ever-id';

/**
 * The Ever ID sign-in, next-auth side.
 *
 * next-auth verifies the Ever ID sign-in (PKCE, state, nonce, ID token). The ID token is then exchanged ONCE
 * with the Gauzy API (`POST /api/auth/zitadel/token`), which knows which workspaces the identity is linked to.
 * The answer drives the rest of the sign-in:
 *
 * - workspaces: the existing workspace chooser at /auth/workspace, then the unchanged workspace sign-in;
 * - a link that needs Gauzy's one-time e-mail code: /auth/passcode?ever_id=confirm;
 * - a person new to the product (where the API offers the sign-up): /auth/signup?ever_id=signup;
 * - no workspace: an error page, and nothing is created. With EVER_ID_TEAMS_AUTO_PROVISION=true the page also offers
 *   the usual sign-up: an account is only ever created by that sign-up, after the person confirms it there.
 *
 * For those two steps the API's one-time key goes into a sealed httpOnly cookie for this app's routes
 * (core/lib/auth/ever-id/handoff.ts), never into the URL.
 *
 * next-auth asks the adapter for the user BEFORE the signIn callback runs, and again after it, then runs the
 * jwt callback, all within the one callback request. The exchange result is kept in memory for exactly that
 * request: by the next-auth `account` object (the signIn and jwt callbacks receive the same one) and, for the
 * adapter's second lookup, by the provider account id for at most MEMO_TTL_MS.
 */

/** Where a sign-in without any workspace ends. */
const EVER_ID_NO_WORKSPACE_PATH = '/auth/error?error=EverIdNoWorkspace';

/** The same, on a deployment that opted in to offering its usual sign-up there (EVER_ID_TEAMS_AUTO_PROVISION). */
const EVER_ID_NO_WORKSPACE_SIGNUP_PATH = '/auth/error?error=EverIdNoWorkspaceSignup';

/** Where a sign-in ends whose every workspace requires another sign-in method (its company sign-in). */
const EVER_ID_BLOCKED_PATH = '/auth/error?error=EverIdWorkspaceBlocked';

/** How long the adapter can still read an exchange by provider account id. */
const MEMO_TTL_MS = 30_000;

/** Bounds the per-subject memo, whatever happens to callbacks that never reach the adapter. */
const MEMO_MAX_ENTRIES = 1_000;

const ORGS_CLAIM = 'urn:ever:orgs';

type EverIdExchange =
	| { kind: 'workspaces'; response: IEverIdWorkspacesResponse }
	| { kind: 'blocked' }
	| { kind: 'confirm_required'; handoff: string }
	| { kind: 'signup_required'; handoff: string }
	| { kind: 'no_workspace' }
	| { kind: 'rejected' }
	| { kind: 'gauzy_error' };

interface EverIdSignInRecord {
	exchange: EverIdExchange;
	preselectTenantId?: string;
}

/** The parts of a next-auth account this module reads. */
interface EverIdAccount {
	provider: string;
	providerAccountId: string;
	id_token?: string;
}

const byAccount = new WeakMap<object, EverIdSignInRecord>();
const bySubject = new Map<string, { record: EverIdSignInRecord; expiresAt: number }>();

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isWorkspace(value: unknown): value is IEverIdWorkspace {
	if (!isRecord(value) || typeof value.token !== 'string' || !value.token) return false;
	return isRecord(value.user) && typeof value.user.id === 'string' && !!value.user.id;
}

/** The hand-off key of an answer, only when it has the shape of one. */
function handoffOf(data: Record<string, unknown>): string | null {
	return readEverIdHandoff(typeof data.handoff === 'string' ? data.handoff : null);
}

/** A 200 answer: the workspaces (minus malformed entries), or a link that needs the one-time e-mail code. */
function fromSuccess(data: Record<string, unknown>): EverIdExchange {
	if (data.confirm_required === true) {
		const handoff = handoffOf(data);
		return handoff ? { kind: 'confirm_required', handoff } : { kind: 'gauzy_error' };
	}
	if (!Array.isArray(data.workspaces)) return { kind: 'gauzy_error' };
	const response = data as unknown as IEverIdWorkspacesResponse;
	const workspaces = response.workspaces.filter(isWorkspace);
	if (workspaces.length) return { kind: 'workspaces', response: { ...response, workspaces } };
	return response.blocked_workspaces?.length ? { kind: 'blocked' } : { kind: 'no_workspace' };
}

/** A 404 answer: the sign-up offer or "no workspace"; any other 404 means the routes are off. */
function fromNotFound(data: Record<string, unknown>): EverIdExchange {
	if (data.code === 'signup_required') {
		const handoff = handoffOf(data);
		return handoff ? { kind: 'signup_required', handoff } : { kind: 'gauzy_error' };
	}
	return data.code === 'no_workspace' ? { kind: 'no_workspace' } : { kind: 'gauzy_error' };
}

/** Maps an answer of `POST /api/auth/zitadel/token` to what the sign-in does next. */
function toEverIdExchange(result: EverIdApiResult<IEverIdTokenResponse | IEverIdTokenNotFound>): EverIdExchange {
	const data: unknown = result.data;
	if (result.status === 200 && isRecord(data)) return fromSuccess(data);
	if (result.status === 404 && isRecord(data)) return fromNotFound(data);
	// 401: the API refused the token. Anything else (the routes switched off, a rate limit, an outage) is the API's.
	return result.status === 401 ? { kind: 'rejected' } : { kind: 'gauzy_error' };
}

/**
 * The tenant to start the chooser on: the ID token's organizations list the product tenants they are
 * linked to (`urn:ever:orgs[].links[].product_tenant_id`); exactly one matching workspace is preselected.
 */
function everIdPreselectTenantId(
	profile: Record<string, unknown> | undefined,
	workspaces: IEverIdWorkspace[]
): string | undefined {
	const orgs = profile?.[ORGS_CLAIM];
	if (!Array.isArray(orgs)) return undefined;
	const linked = new Set<string>();
	for (const org of orgs) {
		const links = isRecord(org) && Array.isArray(org.links) ? org.links : [];
		for (const link of links) {
			if (isRecord(link) && typeof link.product_tenant_id === 'string' && link.product_tenant_id) {
				linked.add(link.product_tenant_id);
			}
		}
	}
	const matches = workspaces.filter((workspace) => {
		const tenantId = workspace.user.tenant?.id;
		return !!tenantId && linked.has(tenantId);
	});
	return matches.length === 1 ? (matches[0].user.tenant?.id ?? undefined) : undefined;
}

const OUTCOMES: Record<EverIdExchange['kind'], EverIdSignInOutcome> = {
	workspaces: 'ok',
	blocked: 'blocked',
	confirm_required: 'confirm_required',
	signup_required: 'signup_required',
	no_workspace: 'no_workspace',
	rejected: 'rejected',
	gauzy_error: 'gauzy_error'
};

function remember(account: EverIdAccount, record: EverIdSignInRecord): void {
	byAccount.set(account, record);
	const now = Date.now();
	bySubject.delete(account.providerAccountId);
	// Entries are kept in insertion order, which is also expiry order: the expired ones go first; a live entry is
	// only dropped when the memo is full of live ones (more than MEMO_MAX_ENTRIES sign-ins within MEMO_TTL_MS).
	for (const [subject, entry] of bySubject) {
		if (entry.expiresAt > now && bySubject.size < MEMO_MAX_ENTRIES) break;
		bySubject.delete(subject);
	}
	bySubject.set(account.providerAccountId, { record, expiresAt: now + MEMO_TTL_MS });
}

/** The exchange of this sign-in: made on the first call, reused by every later callback of the same sign-in. */
async function signInRecord(account: EverIdAccount, profile?: Record<string, unknown>): Promise<EverIdSignInRecord> {
	const known = byAccount.get(account);
	if (known) return known;

	const startedAt = Date.now();
	let status = 0;
	let exchange: EverIdExchange;
	if (typeof account.id_token === 'string' && account.id_token) {
		try {
			const result = await signWithEverIdRequest(account.id_token);
			status = result.status;
			exchange = toEverIdExchange(result);
		} catch {
			exchange = { kind: 'gauzy_error' };
		}
	} else {
		exchange = { kind: 'rejected' };
	}

	const record: EverIdSignInRecord = {
		exchange,
		preselectTenantId:
			exchange.kind === 'workspaces' ? everIdPreselectTenantId(profile, exchange.response.workspaces) : undefined
	};
	remember(account, record);
	logEverIdOutcome('ever_id.signin', { outcome: OUTCOMES[exchange.kind], latencyMs: Date.now() - startedAt, status });
	return record;
}

/**
 * Hands the key of a step to this app's routes in the sealed cookie, and returns the page of the step (which
 * carries the step marker only); `false` when no secret is configured to seal it with.
 */
async function continueWithStep(step: EverIdStep, handoff: string): Promise<string | false> {
	const sealed = sealEverIdHandoff(handoff, step);
	if (!sealed) return false;
	// Set on the response of this callback request (next-auth's redirect to the step's page).
	(await cookies()).set(everIdHandoffCookie(sealed, isHttpsRequest(await headers())));
	return everIdStepPath(step);
}

/**
 * next-auth `signIn` callback for Ever ID: `true` to continue to the workspace chooser, a same-origin path
 * (carrying a step marker at most) to continue elsewhere, `false` to refuse.
 */
export async function everIdSignInCallback(
	account: EverIdAccount,
	profile?: Record<string, unknown>
): Promise<boolean | string> {
	const config = getEverIdConfig();
	if (!config) return false;
	const { exchange } = await signInRecord(account, profile);
	switch (exchange.kind) {
		case 'workspaces':
			return true;
		case 'confirm_required':
			return continueWithStep('confirm', exchange.handoff);
		case 'signup_required':
			return continueWithStep('signup', exchange.handoff);
		case 'no_workspace':
			return config.autoProvision ? EVER_ID_NO_WORKSPACE_SIGNUP_PATH : EVER_ID_NO_WORKSPACE_PATH;
		case 'blocked':
			return EVER_ID_BLOCKED_PATH;
		default:
			return false;
	}
}

/**
 * The adapter's `getUserByAccount` for Ever ID: the Gauzy user the exchange resolved, so next-auth never
 * reaches `createUser` for a linked person. `null` before the exchange (next-auth asks once before the signIn
 * callback) and for any other answer, which never continues to the adapter (the signIn callback redirects).
 */
export function everIdUserByAccount(providerAccountId: string) {
	const entry = bySubject.get(providerAccountId);
	if (!entry) return null;
	if (entry.expiresAt <= Date.now()) {
		bySubject.delete(providerAccountId);
		return null;
	}
	const { exchange } = entry.record;
	if (exchange.kind !== 'workspaces') return null;
	const first = exchange.response.workspaces[0];
	return {
		id: first.user.id,
		email: exchange.response.confirmed_email || first.user.email || '',
		name: first.user.name ?? null,
		emailVerified: null
	};
}

/**
 * The next-auth `jwt` callback data of an Ever ID sign-in: the workspace list for the chooser (no Gauzy
 * access token exists yet; the chooser's workspace sign-in makes it). `undefined` when there is none.
 */
export function everIdJwtPayload(account: EverIdAccount): IEverIdSessionData | undefined {
	// The subject memo is left to expire (MEMO_TTL_MS): another sign-in of the same person running at the same
	// time may still need it for its own adapter lookup.
	const record = byAccount.get(account);
	if (record?.exchange.kind !== 'workspaces') return undefined;
	const { response } = record.exchange;
	return {
		provider: 'ever-id',
		workspaces: response.workspaces,
		confirmed_mail: response.confirmed_email,
		...(record.preselectTenantId ? { preselectTenantId: record.preselectTenantId } : {})
	};
}

/**
 * Whether next-auth session data is what an Ever ID sign-in left for the chooser. The chooser's workspace sign-in
 * updates the session once it succeeded; for an Ever ID session that update ends what the session holds (auth.ts):
 * from then on the Gauzy cookies are the session, and neither the workspace tokens nor the Gauzy tokens stay in
 * the next-auth one, where they could start another session after a sign-out elsewhere.
 */
export function isEverIdSessionData(value: unknown): boolean {
	return isRecord(value) && value.provider === 'ever-id';
}

/** Whether next-auth is handling the Ever ID callback in this request (createUser receives no provider). */
export function isEverIdCallbackRequest(request: { url?: string } | undefined): boolean {
	if (!request?.url) return false;
	try {
		return /\/api\/auth\/callback\/ever-id\/?$/.test(new URL(request.url).pathname);
	} catch {
		return false;
	}
}
