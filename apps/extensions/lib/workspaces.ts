export interface TeamChoice {
	id: string;
	name: string;
}

/** A workspace a confirmed email code may enter, with the short token that enters it. */
export interface WorkspaceChoice {
	token: string;
	name: string;
	lastTeamId?: string;
	teams: TeamChoice[];
}

/** What the extension keeps of a signed-in person, in the browser's local extension storage. */
export interface Session {
	apiUrl: string;
	token: string;
	refreshToken: string | null;
	userId: string;
	email: string;
	name: string;
	tenantId: string;
	organizationId: string;
	employeeId: string | null;
	teams: TeamChoice[];
	teamId: string | null;
}

/** One field of an API answer, whatever the answer holds. */
function fieldOf(value: unknown, key: string): unknown {
	if (typeof value !== 'object' || value === null) {
		return undefined;
	}
	return (value as Record<string, unknown>)[key];
}

function textOf(value: unknown): string {
	if (typeof value === 'string') {
		return value;
	}
	return '';
}

function listOf(value: unknown): unknown[] {
	if (Array.isArray(value)) {
		return value;
	}
	return [];
}

function teamsOf(workspace: unknown): TeamChoice[] {
	return listOf(fieldOf(workspace, 'current_teams'))
		.map((team) => ({ id: textOf(fieldOf(team, 'team_id')), name: textOf(fieldOf(team, 'team_name')) }))
		.filter((team) => team.id.length > 0);
}

/** The workspaces of a `POST /auth/signin.email/confirm` answer. */
export function workspacesOf(answer: unknown): WorkspaceChoice[] {
	return listOf(fieldOf(answer, 'workspaces'))
		.filter((workspace) => textOf(fieldOf(workspace, 'token')).length > 0)
		.map((workspace) => {
			const user = fieldOf(workspace, 'user');
			const lastTeamId = textOf(fieldOf(user, 'lastTeamId'));
			const choice: WorkspaceChoice = {
				token: textOf(fieldOf(workspace, 'token')),
				name: textOf(fieldOf(fieldOf(user, 'tenant'), 'name')),
				teams: teamsOf(workspace)
			};
			if (lastTeamId) {
				choice.lastTeamId = lastTeamId;
			}
			return choice;
		});
}

function nameOf(user: unknown): string {
	const fullName = [textOf(fieldOf(user, 'firstName')), textOf(fieldOf(user, 'lastName'))].filter(Boolean).join(' ');
	if (fullName) {
		return fullName;
	}
	return textOf(fieldOf(user, 'name')) || textOf(fieldOf(user, 'email'));
}

/** The workspace's last team when it is one of its teams, else its first team. */
function activeTeamIdOf(workspace: WorkspaceChoice): string | null {
	const lastTeam = workspace.teams.find((team) => team.id === workspace.lastTeamId);
	if (lastTeam) {
		return lastTeam.id;
	}
	return workspace.teams[0]?.id ?? null;
}

/** The session of a `POST /auth/signin.workspace` answer; null when it carries no access token. */
export function sessionFrom(answer: unknown, workspace: WorkspaceChoice, apiUrl: string): Session | null {
	const token = textOf(fieldOf(answer, 'token'));
	if (!token) {
		return null;
	}
	const user = fieldOf(answer, 'user');
	const employee = fieldOf(user, 'employee');
	const organizationId = textOf(fieldOf(employee, 'organizationId')) || textOf(fieldOf(user, 'lastOrganizationId'));
	const teamId = activeTeamIdOf(workspace);

	return {
		apiUrl,
		token,
		refreshToken: textOf(fieldOf(answer, 'refresh_token')) || null,
		userId: textOf(fieldOf(user, 'id')),
		email: textOf(fieldOf(user, 'email')),
		name: nameOf(user),
		tenantId: textOf(fieldOf(user, 'tenantId')),
		organizationId,
		employeeId: textOf(fieldOf(employee, 'id')) || null,
		teams: workspace.teams,
		teamId
	};
}

/**
 * The session to keep after a token renewal: the stored one with the new access token and the refresh token the API
 * rotated (the one sent is revoked). Null when the stored session is no longer the one renewed: the person signed
 * out, signed in again or changed the API address meanwhile, and that must not be undone.
 */
export function renewedSessionOf(stored: Session | null, renewedFrom: Session, answer: unknown): Session | null {
	const token = textOf(fieldOf(answer, 'token'));
	const isSameSignIn = stored !== null && stored.refreshToken === renewedFrom.refreshToken;
	if (!token || !isSameSignIn) {
		return null;
	}
	const refreshToken = textOf(fieldOf(answer, 'refresh_token')) || stored.refreshToken;
	return { ...stored, token, refreshToken };
}
