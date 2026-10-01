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
	/** The workspace entries carry no team list (the chooser then shows workspaces only). */
	teamsUnavailable: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isWorkspace(value: unknown): value is IEverIdWorkspace {
	return isRecord(value) && typeof value.token === 'string' && isRecord(value.user);
}

/** The chooser's workspace shape, from an Ever ID workspace entry. */
function toChooserWorkspace(workspace: IEverIdWorkspace): ISigninEmailConfirmWorkspaces {
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
		current_teams: workspace.current_teams as ISigninEmailConfirmWorkspaces['current_teams']
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
	return {
		workspaces: workspaces.map(toChooserWorkspace),
		confirmedEmail: typeof confirmedEmail === 'string' ? confirmedEmail : '',
		preselectIndex:
			typeof preselectTenantId === 'string' && preselectTenantId
				? workspaces.findIndex((workspace) => workspace.user.tenant?.id === preselectTenantId)
				: -1,
		teamsUnavailable: workspaces.every((workspace) => !Array.isArray(workspace.current_teams))
	};
}

/** The chooser data of an Ever ID sign-in, or `null` for any other session. */
export function readEverIdSession(session: unknown): EverIdChooserData | null {
	const data = isRecord(session) ? session.authCookie : undefined;
	if (!isRecord(data) || data.provider !== 'ever-id') return null;
	return toEverIdChooserData(data.workspaces, data.confirmed_mail, data.preselectTenantId);
}
