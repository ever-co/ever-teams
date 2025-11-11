import { ISigninEmailConfirmWorkspaces } from '@/core/types/interfaces/auth/auth';

/**
 * Check if a workspace has at least one team
 * @param workspace - The workspace to check
 * @returns true if workspace has at least one team, false otherwise
 */
export function hasTeams(workspace: ISigninEmailConfirmWorkspaces | null | undefined): boolean {
	if (!workspace) return false;
	return Array.isArray(workspace.current_teams) && workspace.current_teams.length > 0;
}

/**
 * Get the number of teams in a workspace
 * @param workspace - The workspace to check
 * @returns The number of teams in the workspace
 */
export function getTeamCount(workspace: ISigninEmailConfirmWorkspaces | null | undefined): number {
	if (!workspace || !Array.isArray(workspace.current_teams)) return 0;
	return workspace.current_teams.length;
}

/**
 * Filter workspaces to only include those with at least one team
 * @param workspaces - Array of workspaces to filter
 * @returns Array of workspaces that have at least one team
 */
export function filterWorkspacesWithTeams(
	workspaces: ISigninEmailConfirmWorkspaces[]
): ISigninEmailConfirmWorkspaces[] {
	if (!workspaces || workspaces.length === 0) return [];
	return workspaces.filter((workspace) => hasTeams(workspace));
}

/**
 * Check if all workspaces are empty (have no teams)
 * @param workspaces - Array of workspaces to check
 * @returns true if all workspaces have no teams, false otherwise
 */
export function areAllWorkspacesEmpty(workspaces: ISigninEmailConfirmWorkspaces[]): boolean {
	if (!workspaces || workspaces.length === 0) return true;
	return workspaces.every((workspace) => !hasTeams(workspace));
}

/**
 * Get the first team ID from a workspace (safely)
 * @param workspace - The workspace to get the first team from
 * @returns The first team ID or undefined if no teams exist
 */
export function getFirstTeamId(workspace: ISigninEmailConfirmWorkspaces | null | undefined): string | undefined {
	if (!workspace || !hasTeams(workspace)) return undefined;
	return workspace.current_teams[0]?.team_id;
}

/**
 * Find a workspace that contains a specific team
 * @param workspaces - Array of workspaces to search
 * @param teamId - The team ID to search for
 * @returns The index of the workspace containing the team, or -1 if not found
 */
export function findWorkspaceIndexByTeamId(workspaces: ISigninEmailConfirmWorkspaces[], teamId: string): number {
	// Defensive checks: if workspaces is null/undefined/empty or teamId is falsy, return -1
	if (!workspaces || workspaces.length === 0) return -1;
	if (!teamId) return -1;

	return workspaces.findIndex((workspace) =>
		hasTeams(workspace) ? workspace.current_teams.some((team) => team.team_id === teamId) : false
	);
}

/**
 * Check if a workspace contains a specific team
 * @param workspace - The workspace to check
 * @param teamId - The team ID to search for
 * @returns true if the workspace contains the team, false otherwise
 */
export function workspaceHasTeam(workspace: ISigninEmailConfirmWorkspaces | null | undefined, teamId: string): boolean {
	if (!workspace || !hasTeams(workspace) || !teamId) return false;
	return workspace.current_teams.some((team) => team.team_id === teamId);
}
