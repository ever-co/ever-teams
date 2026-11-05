import { ISigninEmailConfirmWorkspaces } from '@/core/types/interfaces/auth/auth';
import { findMostRecentWorkspace, safeTimestamp } from '@/core/lib/utils/date-comparison.utils';

/** Past this many days without use, a sign-in shows the workspace list again. */
export const REMEMBERED_TEAM_MAX_AGE_DAYS = 30;

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const REMEMBERED_TEAM_MAX_AGE_MS = REMEMBERED_TEAM_MAX_AGE_DAYS * DAY_IN_MS;

export const REMEMBERED_TEAMS_STORAGE_KEY = 'remembered-teams';

/** The team this browser last opened for one e-mail address; no team once an automatic continue to it failed. */
export type RememberedTeamRecord = {
	teamId: string | null;
	usedAt: number;
};

export type TeamPick = {
	workspaceIndex: number;
	teamId: string;
};

type MaybeTeamId = string | null | undefined;

type RememberedTeams = Record<string, RememberedTeamRecord>;

function isRecord(value: unknown): value is Record<string, unknown> {
	if (typeof value !== 'object') {
		return false;
	}
	if (value === null) {
		return false;
	}
	return !Array.isArray(value);
}

function isRememberedTeamRecord(value: unknown): value is RememberedTeamRecord {
	if (!isRecord(value)) {
		return false;
	}
	const hasUsableTime = typeof value.usedAt === 'number' && Number.isFinite(value.usedAt);
	const hasTeamOrNone = typeof value.teamId === 'string' || value.teamId === null;
	return hasUsableTime && hasTeamOrNone;
}

function isRecent(usedAt: number, now: number): boolean {
	const age = now - usedAt;
	return age <= REMEMBERED_TEAM_MAX_AGE_MS;
}

/** Gauzy sends no tenant for an account never set up; an Ever ID list sends an empty one. */
function isSetUp(workspace: ISigninEmailConfirmWorkspaces): boolean {
	const tenantName = workspace.user?.tenant?.name;
	return Boolean(tenantName);
}

function listsTeam(workspace: ISigninEmailConfirmWorkspaces, teamId: string): boolean {
	const teams = workspace.current_teams;
	if (!Array.isArray(teams)) {
		return false;
	}
	return teams.some((team) => team?.team_id === teamId);
}

export function findListedTeam(workspaces: ISigninEmailConfirmWorkspaces[], teamId: MaybeTeamId): TeamPick | null {
	if (!teamId) {
		return null;
	}
	const workspaceIndex = workspaces.findIndex((workspace) => listsTeam(workspace, teamId));
	if (workspaceIndex < 0) {
		return null;
	}
	return { workspaceIndex, teamId };
}

/** The first candidate the list still shows: a team the person left is skipped instead of hiding the next one. */
export function firstListedTeam(
	workspaces: ISigninEmailConfirmWorkspaces[],
	candidates: readonly MaybeTeamId[]
): TeamPick | null {
	for (const candidate of candidates) {
		const pick = findListedTeam(workspaces, candidate);
		if (pick) {
			return pick;
		}
	}
	return null;
}

function openablePick(workspaces: ISigninEmailConfirmWorkspaces[], teamId: string): TeamPick | null {
	const pick = findListedTeam(workspaces, teamId);
	if (!pick) {
		return null;
	}
	const workspace = workspaces[pick.workspaceIndex];
	if (!isSetUp(workspace)) {
		return null;
	}
	return pick;
}

function latestWorkspace(workspaces: ISigninEmailConfirmWorkspaces[]): ISigninEmailConfirmWorkspaces | null {
	if (workspaces.length === 0) {
		return null;
	}
	return findMostRecentWorkspace(workspaces);
}

/** Gauzy's last team of the account signed in to most recently, whatever its age. */
export function findLatestServerTeamId(workspaces: ISigninEmailConfirmWorkspaces[]): string | null {
	const latest = latestWorkspace(workspaces);
	if (!latest) {
		return null;
	}
	return latest.user.lastTeamId ?? null;
}

function serverPick(workspaces: ISigninEmailConfirmWorkspaces[], now: number): TeamPick | null {
	const latest = latestWorkspace(workspaces);
	if (!latest) {
		return null;
	}
	const lastLoginAt = safeTimestamp(latest.user.lastLoginAt);
	const hasSignedIn = lastLoginAt > 0;
	const signedInRecently = isRecent(lastLoginAt, now);
	const isFresh = hasSignedIn && signedInRecently;
	if (!isFresh) {
		return null;
	}
	const teamId = latest.user.lastTeamId;
	if (!teamId) {
		return null;
	}
	if (!listsTeam(latest, teamId)) {
		return null;
	}
	if (!isSetUp(latest)) {
		return null;
	}
	const workspaceIndex = workspaces.indexOf(latest);
	return { workspaceIndex, teamId };
}

/**
 * The team a sign-in opens without showing the list, or null to show it.
 *
 * A browser that knows this e-mail decides alone: its team, if used within the last 30 days. A browser that never saw
 * it falls back to Gauzy's last team. Either way the team must be in the list Gauzy just returned, which drops
 * deactivated accounts and teams or organizations the person was removed from, and its workspace must be set up.
 */
export function pickRememberedTeam(
	workspaces: ISigninEmailConfirmWorkspaces[],
	record: RememberedTeamRecord | null,
	now: number
): TeamPick | null {
	if (!record) {
		return serverPick(workspaces, now);
	}
	if (!record.teamId) {
		return null;
	}
	if (!isRecent(record.usedAt, now)) {
		return null;
	}
	return openablePick(workspaces, record.teamId);
}

function emailKey(email: string | null | undefined): string {
	if (!email) {
		return '';
	}
	return email.trim().toLowerCase();
}

function canUseStorage(): boolean {
	return typeof window !== 'undefined';
}

function readRememberedTeams(): RememberedTeams {
	if (!canUseStorage()) {
		return {};
	}
	try {
		const stored = window.localStorage.getItem(REMEMBERED_TEAMS_STORAGE_KEY);
		if (!stored) {
			return {};
		}
		const parsed: unknown = JSON.parse(stored);
		if (!isRecord(parsed)) {
			return {};
		}
		return parsed as RememberedTeams;
	} catch {
		return {};
	}
}

function writeRememberedTeam(email: string | null | undefined, record: RememberedTeamRecord) {
	const key = emailKey(email);
	if (!key) {
		return;
	}
	if (!canUseStorage()) {
		return;
	}
	const teams = readRememberedTeams();
	teams[key] = record;
	try {
		window.localStorage.setItem(REMEMBERED_TEAMS_STORAGE_KEY, JSON.stringify(teams));
	} catch {
		// A full or blocked storage only costs the shortcut: the next sign-in shows the list.
	}
}

export function readRememberedTeam(email: string | null | undefined): RememberedTeamRecord | null {
	const key = emailKey(email);
	if (!key) {
		return null;
	}
	const record = readRememberedTeams()[key];
	if (!isRememberedTeamRecord(record)) {
		return null;
	}
	return record;
}

export function rememberTeam(email: string | null | undefined, teamId: MaybeTeamId, now = Date.now()) {
	if (!teamId) {
		return;
	}
	writeRememberedTeam(email, { teamId, usedAt: now });
}

/**
 * Keeps the e-mail known to this browser without a team, so the next sign-in shows the list instead of trying the
 * same team again through Gauzy's last team.
 */
export function forgetRememberedTeam(email: string | null | undefined, now = Date.now()) {
	writeRememberedTeam(email, { teamId: null, usedAt: now });
}
