import { decodeJWT } from '@/core/lib/auth/jwt-utils';
import { teamDefaultProjectId } from '@/core/lib/helpers/team-default-project';
import {
	getAccessTokenCookie,
	getSharedActiveProjectIdCookie,
	getSharedActiveTeamIdCookie,
	getSharedOrganizationIdCookie,
	registerTabWorkScope,
	setActiveProjectIdCookie,
	setActiveTeamIdCookie,
	setOrganizationIdCookie,
	setSharedActiveProjectIdCookie
} from '@/core/lib/helpers/cookies';

/**
 * The organization a tab works in (#5134).
 *
 * The organization, team and access token cookies are shared by every tab of the browser, and an organization switch in
 * one tab replaces them for all. A tab still showing a team of the first organization then sent its timer requests and
 * its reads with the other organization's ids and token: its heartbeats wrote time slots in the other organization, its
 * stop found no running timer there (406) while its run went on in its own organization, and a member's team list was
 * refused (400).
 *
 * A tab now keeps the organization of its own team. While the cookies name another organization of the same session
 * (the same person in the same workspace), the tab builds its requests with its own organization and team, and sends
 * them with the newest access token it saw for that organization. That token is held in this tab's memory only, never
 * stored, and never renewed: renewing it would replace the session the other tab works with. Once it is about to
 * expire, or Gauzy refuses it, the tab sends nothing more but the session's own requests, and the person chooses where
 * it works (tab-organization-notice.tsx).
 */

/** The organization, team and project this tab shows, from its own active team. */
interface TabTeam {
	organizationId: string;
	teamId: string | null;
	projectId: string | null;
}

/** What a tab acts in now. */
type TabScope =
	| { held: false }
	| {
			/** The session in the cookies is in another organization than this tab shows. */
			held: true;
			/**
			 * The organization cookie names another organization: another tab opened it. False while this tab's own switch
			 * back to its organization is on its way (the cookie already names it, the session's token not yet).
			 */
			isOtherOrganizationOpen: boolean;
			/** This tab's own organization, team and project. */
			organizationId: string;
			teamId: string | null;
			projectId: string | null;
			/** The organization the cookies name now (another tab switched to it). */
			sharedOrganizationId: string;
			/** The access token this tab acts with in its own organization, null once it is gone or about to expire. */
			accessToken: string | null;
	  };

/** Fired on `window` when this tab starts or stops acting in its own organization, or loses its token for it. */
export const TAB_SCOPE_CHANGED_EVENT = 'ever-teams:tab-scope-changed';

export { TAB_TEAM_HEADER } from './tab-team-header';

/** A token this close to its expiry is not used: the request could reach the API after it. */
const EXPIRY_MARGIN_SECONDS = 30;

const SHARED: TabScope = { held: false };

let tabTeam: TabTeam | null = null;
/** The person and workspace of the tokens below: another one empties them. */
let sessionOwner: { userId: string; tenantId: string | null } | null = null;
/** The newest access token this tab saw for each organization of the session. */
const tokensByOrganization = new Map<string, { token: string; expiresAt: number }>();
/** Tokens the API refused while this tab acted with them: never used again. */
const refusedTokens = new Set<string>();
let lastScopeKey = 'shared';

function ownerOf(
	token: string
): { userId: string; tenantId: string | null; organizationId: string | null; exp: number } | null {
	const payload = decodeJWT(token) as (ReturnType<typeof decodeJWT> & { sub?: string }) | null;
	const userId = payload?.id ?? payload?.sub;
	if (!payload || !userId) return null;
	return {
		userId,
		tenantId: payload.tenantId ?? null,
		organizationId: payload.organizationId ?? null,
		exp: payload.exp
	};
}

/** Forgets every token, and this tab's team, when the session is another person's or another workspace's. */
function forgetSession(): void {
	tokensByOrganization.clear();
	refusedTokens.clear();
	sessionOwner = null;
	tabTeam = null;
}

/** Keeps the cookie's token under its organization; answers false when it is another session's. */
function noteSharedToken(token: string): boolean {
	const owner = ownerOf(token);
	if (!owner) return false;
	const isOtherSession =
		!!sessionOwner && (sessionOwner.userId !== owner.userId || sessionOwner.tenantId !== owner.tenantId);
	if (isOtherSession) {
		forgetSession();
		return false;
	}
	sessionOwner = { userId: owner.userId, tenantId: owner.tenantId };
	if (!owner.organizationId || refusedTokens.has(token)) return true;
	const known = tokensByOrganization.get(owner.organizationId);
	if (!known || known.expiresAt < owner.exp) {
		tokensByOrganization.set(owner.organizationId, { token, expiresAt: owner.exp });
	}
	return true;
}

function scopeKey(scope: TabScope): string {
	if (!scope.held) return 'shared';
	const token = scope.accessToken ? 'token' : 'none';
	return `held:${scope.organizationId}:${scope.sharedOrganizationId}:${scope.isOtherOrganizationOpen}:${token}`;
}

function announceIfChanged(scope: TabScope): void {
	const key = scopeKey(scope);
	if (key === lastScopeKey) return;
	lastScopeKey = key;
	if (typeof window === 'undefined') return;
	// Told after the current task: the scope is read while components render, which must not update others meanwhile
	window.setTimeout(() => window.dispatchEvent(new Event(TAB_SCOPE_CHANGED_EVENT)), 0);
}

/** The organization and team cookies are read on many renders: the answer is kept while nothing it depends on moved. */
const SCOPE_MEMO_MS = 5_000;
let memo: { cookies: string; tabTeam: TabTeam | null; refused: number; at: number; scope: TabScope } | null = null;

/** What this tab acts in now: its own organization while the cookies name another one of the session. */
export function tabScope(): TabScope {
	if (typeof window === 'undefined' || !tabTeam) return SHARED;
	const cookies = typeof document === 'undefined' ? '' : document.cookie;
	const now = Date.now();
	const last = memo;
	const isFresh =
		last?.cookies === cookies &&
		last.tabTeam === tabTeam &&
		last.refused === refusedTokens.size &&
		now - last.at < SCOPE_MEMO_MS;
	if (isFresh) return last.scope;
	let scope: TabScope = SHARED;
	try {
		scope = computeTabScope();
	} catch (error) {
		// A tab that cannot tell acts as before, with the cookies
		console.error('[Auth] Could not tell which organization this tab works in:', error);
	}
	memo = { cookies, tabTeam, refused: refusedTokens.size, at: now, scope };
	announceIfChanged(scope);
	return scope;
}

function computeTabScope(): TabScope {
	if (typeof window === 'undefined' || !tabTeam) return SHARED;
	const sharedToken = getAccessTokenCookie();
	// Signed out, or another person or workspace signed in meanwhile: the session code decides, not this tab
	if (!sharedToken || !noteSharedToken(sharedToken) || !tabTeam) return SHARED;
	const sharedOrganizationId = getSharedOrganizationIdCookie() || null;
	if (!sharedOrganizationId) return SHARED;
	const sharedTokenOrganizationId = ownerOf(sharedToken)?.organizationId ?? null;
	const isOtherOrganizationOpen = sharedOrganizationId !== tabTeam.organizationId;
	const isSessionElsewhere = !!sharedTokenOrganizationId && sharedTokenOrganizationId !== tabTeam.organizationId;
	if (!isOtherOrganizationOpen && !isSessionElsewhere) return SHARED;

	const known = tokensByOrganization.get(tabTeam.organizationId);
	const isUsable = !!known && known.expiresAt - EXPIRY_MARGIN_SECONDS > Date.now() / 1000;
	const accessToken = isUsable && known ? known.token : null;
	// The organization cookie is already this tab's, and the session's switch to it is on its way (or was refused): the
	// tab's own token meanwhile, else the cookies, as before. Nothing for the person to choose.
	if (!isOtherOrganizationOpen) {
		if (!accessToken) return SHARED;
		return {
			held: true,
			isOtherOrganizationOpen: false,
			organizationId: tabTeam.organizationId,
			teamId: tabTeam.teamId,
			projectId: tabTeam.projectId,
			sharedOrganizationId,
			accessToken
		};
	}
	return {
		held: true,
		isOtherOrganizationOpen: true,
		organizationId: tabTeam.organizationId,
		teamId: tabTeam.teamId,
		projectId: tabTeam.projectId,
		sharedOrganizationId,
		accessToken
	};
}

/**
 * The team this tab shows, and so its organization: set when the tab picks or opens a team, before the cookies follow.
 * The cookie's token is noted first, so the tab keeps a token for the organization it leaves.
 */
export function rememberTabTeam(
	team:
		| {
				id?: string | null;
				organizationId?: string | null;
				defaultProjectId?: string | null;
				projects?: { id?: string | null }[] | null;
		  }
		| null
		| undefined
): void {
	if (typeof window === 'undefined') return;
	try {
		const sharedToken = getAccessTokenCookie();
		if (sharedToken) noteSharedToken(sharedToken);
	} catch (error) {
		console.error('[Auth] Could not read the session of this tab:', error);
	}
	tabTeam = team?.organizationId
		? { organizationId: team.organizationId, teamId: team.id || null, projectId: teamDefaultProjectId(team) }
		: null;
	memo = null;
	tabScope();
}

/**
 * The access token a request of this tab goes out with: the cookie's, or this tab's own while it works in its own
 * organization (null once that one is gone: the request is then not sent).
 */
export function requestAccessToken(): string | null {
	const scope = tabScope();
	if (scope.held) return scope.accessToken;
	return getAccessTokenCookie();
}

/**
 * Whether `token` is the one this tab acts with in its own organization now. The cookies are read again: another tab
 * may have renewed the session since the request left, and a token of the session's own organization is then the
 * session's, which the renewal answers.
 */
export function isTabAccessToken(token: string | null | undefined): boolean {
	if (!token) return false;
	const scope = tabScope();
	return scope.held && scope.accessToken === token;
}

/**
 * Writes this tab's organization, team and project to the cookies, shared by every tab, so that the session can follow
 * them back ("Use … in every tab"). The tab stays on its team as it is, with its tasks and the project it chose
 * (CodeRabbit on #5321). Answers the organization the session is to switch to, or null while no other tab has another
 * organization open.
 */
export function bringTabOrganizationBack(): string | null {
	const scope = tabScope();
	// Nothing to bring back while the organization cookie is this tab's already (its switch back is on its way)
	if (!scope.held || !scope.isOtherOrganizationOpen) return null;
	const { organizationId, teamId, projectId } = scope;
	// What the other tab left in the cookies, put back if the session cannot follow (putBackLeftCookies)
	leftCookies = {
		broughtBack: organizationId,
		organizationId: scope.sharedOrganizationId,
		teamId: getSharedActiveTeamIdCookie() || null,
		projectId: getSharedActiveProjectIdCookie() || null
	};
	// The organization first: the cookie readers then answer the cookies again, and the project goes to its cookie
	setOrganizationIdCookie(organizationId);
	if (teamId) setActiveTeamIdCookie(teamId);
	// Even none: the project cookie names one of the other organization
	setActiveProjectIdCookie(projectId ?? '');
	return organizationId;
}

/** The cookies another tab left when this tab brought its own organization back, until the session follows. */
let leftCookies: {
	broughtBack: string;
	organizationId: string;
	teamId: string | null;
	projectId: string | null;
} | null = null;

/**
 * The session could not follow this tab's organization back: Gauzy refused the switch, or did not answer. The cookies
 * another tab left come back (its project, its team, then its organization), so the cookies never name one
 * organization while they carry another's token, and this tab works in its own organization again, or says it can no
 * longer (CodeRabbit on #5321). An organization chosen since, in this tab or another, stands.
 */
export function putBackLeftCookies(broughtBack: string): void {
	const left = leftCookies;
	leftCookies = null;
	if (!left || left.broughtBack !== broughtBack) return;
	const isStillBroughtBack = getSharedOrganizationIdCookie() === broughtBack;
	const sharedToken = getAccessTokenCookie();
	const isSessionElsewhere = !!sharedToken && ownerOf(sharedToken)?.organizationId !== broughtBack;
	if (!isStillBroughtBack || !isSessionElsewhere) return;
	// The project as the other tab left it: this tab does not take it as the project it chose
	if (left.projectId) setSharedActiveProjectIdCookie(left.projectId);
	if (left.teamId) setActiveTeamIdCookie(left.teamId);
	setOrganizationIdCookie(left.organizationId);
	memo = null;
	tabScope();
}

/** The API refused this tab's own token: it is not sent again, and the tab asks the person where it works. */
export function forgetTabAccessToken(token: string | null | undefined): void {
	if (!token) return;
	refusedTokens.add(token);
	for (const [organizationId, known] of tokensByOrganization) {
		if (known.token === token) tokensByOrganization.delete(organizationId);
	}
	memo = null;
	tabScope();
}

/**
 * A request this tab does not send: it works in its own organization, and its token for it is gone. The tab tells the
 * person (tab-organization-notice.tsx); nothing reached the API.
 */
export class TabOrganizationChangedError extends Error {
	readonly isTabOrganizationChanged = true;

	constructor() {
		super('Another tab opened another organization, and this tab can no longer work in its own one');
		this.name = 'TabOrganizationChangedError';
	}
}

/**
 * Requests of the session itself go out whatever organization the tab shows: renewing or ending the session, and
 * switching its organization (which is how the tab brings its own organization back).
 */
export function isSessionRequest(url: string | undefined): boolean {
	if (!url) return false;
	return /(^|\/)auth\//.test(url.replace(/^https?:\/\/[^/]+/i, ''));
}

/** Test-only: forget this tab's team and tokens. */
export function resetTabOrganizationState(): void {
	forgetSession();
	leftCookies = null;
	memo = null;
	lastScopeKey = 'shared';
}

// The organization and team cookie readers answer this tab's own while it works in its own organization; a sign-in or
// a sign-out in this tab starts again from the cookies.
// (A test that mocks the cookies module without it registers nothing.)
registerTabWorkScope?.(
	() => {
		const scope = tabScope();
		// Only while another tab has the cookies on another organization: the cookies are this tab's own otherwise
		return scope.held && scope.isOtherOrganizationOpen
			? { organizationId: scope.organizationId, teamId: scope.teamId, projectId: scope.projectId }
			: null;
	},
	() => {
		forgetSession();
		memo = null;
		announceIfChanged(SHARED);
	},
	(projectId) => {
		// The project this tab chose, kept for when another tab moves the cookies to another organization
		if (tabTeam && tabTeam.projectId !== projectId) tabTeam = { ...tabTeam, projectId };
	}
);
