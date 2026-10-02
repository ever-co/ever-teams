import type { ISigninEmailConfirmWorkspaces } from '@/core/types/interfaces/auth/auth';
import type { IEverIdWorkspace } from '@/core/types/interfaces/auth/ever-id';

/**
 * Reads what an Ever ID sign-in left in the next-auth session for the workspace chooser (browser side):
 * the workspaces with their one-time workspace sign-in tokens, the verified e-mail address and, when the ID
 * token pointed at exactly one of them, the workspace to start on. No Gauzy access token exists at that
 * point; the chooser's usual workspace sign-in creates it.
 */

interface EverIdChooserData {
	workspaces: ISigninEmailConfirmWorkspaces[];
	confirmedEmail: string;
	/** Index of the workspace to start on, or -1. */
	preselectIndex: number;
	/** Some workspace entry carries no team list: the chooser then lists the workspaces only, teams come later. */
	teamsUnavailable: boolean;
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

/**
 * The chooser data of an Ever ID workspace list (the session of a sign-in, or the answer of a confirmed
 * link): entries without a token or a user are dropped; `null` when none is left.
 */
export function toEverIdChooserData(
	list: unknown,
	confirmedEmail: unknown,
	preselectTenantId?: unknown
): EverIdChooserData | null {
	const workspaces = Array.isArray(list) ? list.filter(isWorkspace) : [];
	if (!workspaces.length) return null;
	const teamsUnavailable = workspaces.some((workspace) => !Array.isArray(workspace.current_teams));
	return {
		workspaces: workspaces.map((workspace) => toChooserWorkspace(workspace, !teamsUnavailable)),
		confirmedEmail: typeof confirmedEmail === 'string' ? confirmedEmail : '',
		preselectIndex:
			typeof preselectTenantId === 'string' && preselectTenantId
				? workspaces.findIndex((workspace) => workspace.user.tenant?.id === preselectTenantId)
				: -1,
		teamsUnavailable
	};
}

/** The chooser data of an Ever ID sign-in, or `null` for any other session. */
export function readEverIdSession(session: unknown): EverIdChooserData | null {
	const data = isRecord(session) ? session.authCookie : undefined;
	if (!isRecord(data) || data.provider !== 'ever-id') return null;
	return toEverIdChooserData(data.workspaces, data.confirmed_mail, data.preselectTenantId);
}
