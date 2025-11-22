import { useMemo } from 'react';
import { ISigninEmailConfirmWorkspaces } from '@/core/types/interfaces/auth/auth';
import { hasTeams } from '@/core/lib/utils/workspace.utils';

/**
 * Workspace analysis result
 */
export interface WorkspaceAnalysis {
	/**
	 * Whether user has multiple workspaces
	 * Used by: password, passcode components
	 */
	hasMultipleWorkspaces: boolean;

	/**
	 * The first workspace in the array
	 * Used by: all components
	 */
	firstWorkspace: ISigninEmailConfirmWorkspaces | undefined;

	/**
	 * Whether the first workspace has at least one team
	 * Used by: all components
	 */
	firstWorkspaceHasTeams: boolean;

	/**
	 * Number of teams in the first workspace
	 * Used by: all components
	 */
	firstWorkspaceTeamCount: number;

	/**
	 * Whether any workspace has more than 1 team
	 * Used by: password, passcode components
	 */
	hasMultipleTeamsInAnyWorkspace: boolean;

	/**
	 * Whether to auto-submit the workspace selection form
	 * TRUE only when: exactly 1 workspace with exactly 1 team
	 * FALSE when: 0 teams, 2+ teams, or multiple workspaces
	 * Used by: all components
	 */
	shouldAutoSubmit: boolean;
}

/**
 * Hook to analyze workspace structure and determine auto-submit behavior
 *
 * This hook centralizes the workspace analysis logic used across all authentication flows
 * (password, passcode, OAuth) to ensure consistent behavior and avoid code duplication.
 *
 * Key Logic:
 * - Auto-submit ONLY when user has exactly 1 workspace with exactly 1 team
 * - Do NOT auto-submit when user has 0 teams (allows team creation/joining)
 * - Do NOT auto-submit when user has 2+ teams (requires manual selection)
 * - Do NOT auto-submit when user has multiple workspaces
 *
 * @param workspaces - Array of workspaces to analyze
 * @returns Workspace analysis object with computed properties
 *
 * @example
 * ```typescript
 * // In password/passcode components
 * const workspaceAnalysis = useWorkspaceAnalysis(form.workspaces);
 *
 * // In workspace component
 * const workspaceAnalysis = useWorkspaceAnalysis(workspaces);
 *
 * // Use the analysis
 * if (workspaceAnalysis.shouldAutoSubmit) {
 *   // Auto-submit form
 * }
 * ```
 */
export function useWorkspaceAnalysis(
	workspaces: ISigninEmailConfirmWorkspaces[]
): WorkspaceAnalysis {
	return useMemo(() => {
		// Check if user has multiple workspaces
		const hasMultipleWorkspaces = workspaces.length > 1;

		// Get the first workspace (most common case: single workspace)
		const firstWorkspace = workspaces[0];

		// Check if first workspace has teams using the utility function
		// This function safely handles null/undefined and validates array type
		const firstWorkspaceHasTeams = hasTeams(firstWorkspace);

		// Count teams in first workspace (0 if no teams)
		const firstWorkspaceTeamCount = firstWorkspaceHasTeams
			? firstWorkspace.current_teams.length
			: 0;

		// Check if ANY workspace has more than 1 team
		// Used to determine if we should show workspace selection UI
		const hasMultipleTeamsInAnyWorkspace = workspaces.some(
			(workspace) => hasTeams(workspace) && workspace.current_teams.length > 1
		);

		// Determine if we should auto-submit the workspace selection form
		// CRITICAL: Only auto-submit when user has exactly 1 workspace with exactly 1 team
		//
		// Auto-submit scenarios:
		// 1 workspace, 1 team -> Auto-submit (user has only one option)
		//
		// NO auto-submit scenarios:
		// 1 workspace, 0 teams → Show workspace selection (user needs to create/join team)
		// 1 workspace, 2+ teams → Show workspace selection (user needs to choose team)
		// 2+ workspaces → Show workspace selection (user needs to choose workspace)
		const shouldAutoSubmit =
			workspaces.length === 1 &&
			firstWorkspaceTeamCount === 1;

		return {
			hasMultipleWorkspaces,
			firstWorkspace,
			firstWorkspaceHasTeams,
			firstWorkspaceTeamCount,
			hasMultipleTeamsInAnyWorkspace,
			shouldAutoSubmit
		};
	}, [workspaces]);
}
