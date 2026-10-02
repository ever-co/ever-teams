import type { ISigninEmailConfirmWorkspaces } from '@/core/types/interfaces/auth/auth';
import type { IEverIdWorkspace } from '@/core/types/interfaces/auth/ever-id';

/**
 * Reads what an Ever ID sign-in left in the next-auth session for the workspace chooser (browser side):
 * the workspaces with their one-time workspace sign-in tokens, the verified e-mail address and, when the ID
 * token pointed at exactly one of them, the workspace to start on. No Gauzy access token exists at that
 * point; the chooser's usual workspace sign-in creates it.
 */

export interface EverIdChooserData {
	workspaces: ISigninEmailConfirmWorkspaces[];
	confirmedEmail: string;
	/** Index of the workspace to start on, or -1. */
	preselectIndex: number;
	/** Some workspace entry carries no team list: the chooser then lists the workspaces only, teams come later. */
	teamsUnavailable: boolean;
	/**
	 * Indexes of the workspaces without a tenant yet: accounts whose setup did not finish (it failed, or the sign-up
	 * was completed after checkout). Choosing one resumes the setup (POST /api/auth/ever-id/finish-setup).
	 */
	tenantless: number[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** An entry the chooser can sign in with: a non-empty workspace token and a user (as the server checks too). */
function isWorkspace(value: unknown): value is IEverIdWorkspace {
	return isRecord(value) && typeof value.token === 'string' && !!value.token && isRecord(value.user);
}

/**
 * The chooser's workspace shape, from an Ever ID workspace entry. Without team lists for every workspace, no team
 * list is passed at all: a team of one workspace can then never be sent with another workspace's token.
 */
function toChooserWorkspace(workspace: IEverIdWorkspace, withTeams: boolean): ISigninEmailConfirmWorkspaces {
	const { user } = workspace;
	return {
		token: workspace.token,
		user: {
			email: user.email ?? '',
			imageUrl: user.imageUrl ?? '',
			name: user.name ?? '',
			...(user.lastTeamId ? { lastTeamId: user.lastTeamId } : {}),
			...(user.lastLoginAt ? { lastLoginAt: user.lastLoginAt } : {}),
			tenant: { name: user.tenant?.name ?? '', logo: user.tenant?.logo ?? '' }
		},
		// Anything but a list is no team list: the chooser never receives something it cannot render.
		current_teams: (withTeams && Array.isArray(workspace.current_teams)
			? workspace.current_teams
			: []) as ISigninEmailConfirmWorkspaces['current_teams']
	};
}

/** The workspace entries the chooser lists, in its order: entries without a token or a user are dropped. */
function usableWorkspaces(list: unknown): IEverIdWorkspace[] {
	return Array.isArray(list) ? list.filter(isWorkspace) : [];
}

/**
 * The chooser data of an Ever ID workspace list (the session of a sign-in, or the answer of a confirmed
 * link): entries without a token or a user are dropped; `null` when none is left.
 */
export function toEverIdChooserData(
	list: unknown,
	confirmedEmail: unknown,
	preselectTenantId?: unknown
): EverIdChooserData | null {
	const workspaces = usableWorkspaces(list);
	if (!workspaces.length) return null;
	const teamsUnavailable = workspaces.some((workspace) => !Array.isArray(workspace.current_teams));
	return {
		workspaces: workspaces.map((workspace) => toChooserWorkspace(workspace, !teamsUnavailable)),
		confirmedEmail: typeof confirmedEmail === 'string' ? confirmedEmail : '',
		preselectIndex:
			typeof preselectTenantId === 'string' && preselectTenantId
				? workspaces.findIndex((workspace) => workspace.user.tenant?.id === preselectTenantId)
				: -1,
		teamsUnavailable,
		tenantless: workspaces.flatMap((workspace, index) => (workspace.user.tenant ? [] : [index]))
	};
}

/** What an Ever ID sign-in left in a next-auth session, or `undefined` for any other session. */
function everIdSessionData(session: unknown): Record<string, unknown> | undefined {
	const data = isRecord(session) ? session.authCookie : undefined;
	return isRecord(data) && data.provider === 'ever-id' ? data : undefined;
}

/** The chooser data of an Ever ID sign-in, or `null` for any other session. */
export function readEverIdSession(session: unknown): EverIdChooserData | null {
	const data = everIdSessionData(session);
	return data ? toEverIdChooserData(data.workspaces, data.confirmed_mail, data.preselectTenantId) : null;
}

/**
 * The workspace without a tenant at a chooser index of an Ever ID session (server side, to resume its setup): its
 * workspace token, the verified e-mail address and the user id; `null` when that entry has a tenant or is not there.
 */
export function everIdSetupTarget(
	session: unknown,
	index: number
): { token: string; email: string; userId: string } | null {
	const data = everIdSessionData(session);
	const workspace = data ? usableWorkspaces(data.workspaces)[index] : undefined;
	if (!workspace || workspace.user.tenant) return null;
	const email =
		(typeof data?.confirmed_mail === 'string' && data.confirmed_mail) ||
		(typeof workspace.user.email === 'string' && workspace.user.email) ||
		'';
	return email ? { token: workspace.token, email, userId: workspace.user.id } : null;
}

/** Whether a failed workspace sign-in is Gauzy's answer to an expired workspace token (400 "JWT token has been expired."). */
export function isExpiredWorkspaceTokenError(error: unknown): boolean {
	const response = isRecord(error) && isRecord(error.response) ? error.response : undefined;
	const data = response && isRecord(response.data) ? response.data : undefined;
	return response?.status === 400 && typeof data?.message === 'string' && /expired/i.test(data.message);
}

/**
 * Whether a workspace token is past its expiry (or within `marginS` of it). Ever ID workspace tokens last 15
 * minutes: a chooser left open longer starts the Ever ID sign-in again instead of failing. Only the `exp` claim is
 * read (the API checks the token itself); a token without a readable one counts as valid.
 */
export function isWorkspaceTokenExpired(token: string, nowMs = Date.now(), marginS = 30): boolean {
	try {
		const part = token.split('.')[1] ?? '';
		const json = atob(
			part
				.replace(/-/g, '+')
				.replace(/_/g, '/')
				.padEnd(Math.ceil(part.length / 4) * 4, '=')
		);
		const exp = (JSON.parse(json) as { exp?: unknown }).exp;
		return typeof exp === 'number' && exp * 1000 <= nowMs + marginS * 1000;
	} catch {
		return false;
	}
}
