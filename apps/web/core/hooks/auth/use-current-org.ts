'use client';

import { useCallback, useMemo } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useWorkspaces } from './use-workspaces';
import { useAuthenticateUser } from './use-authenticate-user';
import {
	activeWorkspaceIdState,
	currentWorkspaceState,
	workspacesState,
	hasMultipleWorkspacesState
} from '@/core/stores/auth';
import { TWorkspace } from '@/core/types/schemas/team/organization-team.schema';

/**
 * Hook for managing the current organization (workspace) state and operations.
 *
 * This hook provides organization-specific functionality:
 * - Easy access to current organization state
 * - Organization switching and validation
 * - Current organization-specific operations
 *
 *
 * @author NdekoCode
 * @returns {Object} An object containing current organization data, helper methods, and state management functions
 * @returns {TWorkspace | null} returns.currentOrg - The currently active workspace/organization
 * @returns {string | null} returns.currentOrgId - ID of the currently active workspace
 * @returns {TWorkspace[]} returns.organizations - Array of all available organizations/workspaces
 * @returns {TWorkspace[]} returns.inactiveOrgs - Array of inactive organizations (excluding current one)
 * @returns {boolean} returns.hasMultipleOrgs - Whether user has multiple organizations
 * @returns {boolean} returns.isLoading - Loading state for organizations data
 * @returns {Error | null} returns.error - Error state if any
 * @returns {boolean} returns.isInitialized - Whether organizations data has been initialized
 * @returns {(orgId: string) => TWorkspace | undefined} returns.getOrgById - Method to get organization by ID
 * @returns {(orgId: string) => boolean} returns.hasOrg - Method to check if organization exists
 * @returns {(orgId: string) => void} returns.setActiveOrg - Method to set the active organization
 * @returns {() => Promise<void>} returns.refreshOrgs - Method to refresh organizations data
 * @returns {() => void} returns.invalidateOrgs - Method to invalidate organizations cache
 * @returns {() => Promise<void>} returns.firstLoadOrgsData - Method to perform first load of organizations data
 * @returns {() => {action: string, message: string, organization?: TWorkspace, organizations?: TWorkspace[], redirectTo?: string}} returns.handleOrgBranching - Method to handle organization branching logic
 * @returns {() => Promise<{isValid: boolean, reason: string, action: string, redirectTo?: string}>} returns.validateCurrentOrgAccess - Method to validate user's access to current organization
 * @returns {Object} returns.orgsQuery - Query object for organizations data
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const {
 *     currentOrg,
 *     currentOrgId,
 *     setActiveOrg,
 *     hasMultipleOrgs,
 *     isLoading,
 *     error
 *   } = useCurrentOrg();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   if (!currentOrg) return <div>No organization selected</div>;
 *
 *   return (
 *     <div>
 *       <h1>{currentOrg.name}</h1>
 *       {hasMultipleOrgs && (
 *         <button onClick={() => setActiveOrg('other-org-id')}>
 *           Switch Organization
 *         </button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useCurrentOrg() {
	// Direct access to stores for current organization management
	const [activeWorkspaceId, setActiveWorkspaceId] = useAtom(activeWorkspaceIdState);
	const currentWorkspace = useAtomValue(currentWorkspaceState);
	const workspaces = useAtomValue(workspacesState);
	const hasMultipleWorkspaces = useAtomValue(hasMultipleWorkspacesState);
	const { user } = useAuthenticateUser();

	// Get workspace collection data from useWorkspaces (for collection operations only)
	const {
		isLoading,
		error,
		isInitialized,
		refreshWorkspaces,
		invalidateWorkspaces,
		firstLoadWorkspacesData,
		workspacesQuery
	} = useWorkspaces();

	/**
	 * Get organization by ID (maps to workspace by ID)
	 */
	const getOrgById = useCallback(
		(orgId: string): TWorkspace | undefined => {
			return workspaces.find((w) => w.user.tenant.id === orgId);
		},
		[workspaces]
	);

	/**
	 * Check if organization exists (maps to workspace exists)
	 */
	const hasOrg = useCallback(
		(orgId: string): boolean => {
			return workspaces.some((w) => w.id === orgId);
		},
		[workspaces]
	);

	/**
	 * Set active organization - delegates to workspace management but provides org-centric interface
	 */
	const setActiveOrg = useCallback(
		(orgId: string) => {
			const workspace = workspaces.find((w) => w.id === orgId);
			if (workspace) {
				setActiveWorkspaceId(orgId);
				// Note: Full workspace state update is handled by useWorkspaces
				// This function provides the organization-centric interface
			}
		},
		[workspaces, setActiveWorkspaceId]
	);

	/**
	 * Check if user has multiple organizations
	 */
	const hasMultipleOrgs = useMemo(() => {
		return hasMultipleWorkspaces;
	}, [hasMultipleWorkspaces]);

	/**
	 * Get inactive organizations (maps to inactive workspaces)
	 */
	const inactiveOrgs = useMemo(() => {
		return workspaces.filter((w) => w.id !== activeWorkspaceId);
	}, [workspaces, activeWorkspaceId]);

	/**
	 * Refresh organizations data (maps to refresh workspaces)
	 */
	const refreshOrgs = useCallback(() => {
		return refreshWorkspaces();
	}, [refreshWorkspaces]);

	/**
	 * Invalidate organizations cache (maps to invalidate workspaces)
	 */
	const invalidateOrgs = useCallback(() => {
		return invalidateWorkspaces();
	}, [invalidateWorkspaces]);

	/**
	 * FirstLoad function for InitState
	 */
	const firstLoadOrgsData = useCallback(() => {
		return firstLoadWorkspacesData();
	}, [firstLoadWorkspacesData]);

	/**
	 * Handle organization branching logic (0/1/many orgs)
	 * Moved from useWorkspaces as it's organization-specific logic
	 */
	const handleOrgBranching = useCallback(() => {
		if (!isInitialized || isLoading) {
			return { action: 'loading', message: 'Organizations are still loading...' };
		}

		const orgCount = workspaces.length;

		if (orgCount === 0) {
			return {
				action: 'redirect_create',
				message: 'No organizations found - should redirect to Create Organization page',
				redirectTo: '/create-organization'
			};
		}

		if (orgCount === 1) {
			const singleOrg = workspaces[0];
			return {
				action: 'auto_select',
				message: 'Single organization found - auto-selecting',
				organization: singleOrg
			};
		}

		// Multiple organizations
		return {
			action: 'show_selector',
			message: 'Multiple organizations found - should show selector',
			organizations: workspaces,
			redirectTo: '/select-workspace'
		};
	}, [workspaces, isInitialized, isLoading]);

	/**
	 * Validate current organization access for user
	 * Moved from useWorkspaces as it's current organization-specific logic
	 */
	const validateCurrentOrgAccess = useCallback(async () => {
		if (!user?.id || !isInitialized) {
			return {
				isValid: false,
				reason: 'User not authenticated or organizations not initialized',
				action: 'wait'
			};
		}

		try {
			// Check if user has access to any organization
			if (workspaces.length === 0) {
				console.warn('Organization Validation: No organizations found for user', user.id);
				return {
					isValid: false,
					reason: 'No organizations available for user',
					action: 'redirect_create',
					redirectTo: '/create-organization'
				};
			}

			// Check if current active organization is valid
			if (activeWorkspaceId) {
				const currentOrg = workspaces.find((w) => w.id === activeWorkspaceId);
				if (!currentOrg) {
					console.warn('Organization Validation: Active organization not found in user organizations', {
						activeOrgId: activeWorkspaceId,
						availableOrgs: workspaces.map((w) => w.id)
					});
					return {
						isValid: false,
						reason: 'Active organization not accessible to user',
						action: 'redirect_selector',
						redirectTo: '/select-workspace'
					};
				}

				// Check if user is active in the organization
				const isActiveInOrg = currentOrg.teams.some((team) =>
					team.members?.some((member) => member.employee?.userId === user.id && member.isActive)
				);

				if (!isActiveInOrg) {
					console.warn('Organization Validation: User not active in current organization', {
						userId: user.id,
						orgId: activeWorkspaceId,
						orgName: currentOrg.name
					});
					return {
						isValid: false,
						reason: 'User not active in current organization',
						action: 'redirect_selector',
						redirectTo: '/select-workspace'
					};
				}
			}

			// All validations passed
			console.log('Organization Validation: Current organization access validated successfully', {
				userId: user.id,
				activeOrgId: activeWorkspaceId,
				orgCount: workspaces.length
			});

			return {
				isValid: true,
				reason: 'All organization access validations passed',
				action: 'continue'
			};
		} catch (error) {
			console.error('Organization Validation: Error during current organization access validation', error);
			return {
				isValid: false,
				reason: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
				action: 'continue' // Don't block app on validation errors
			};
		}
	}, [user?.id, workspaces, activeWorkspaceId, isInitialized]);

	return {
		// Current organization interface
		currentOrg: currentWorkspace,
		currentOrgId: activeWorkspaceId,
		organizations: workspaces,
		inactiveOrgs,
		hasMultipleOrgs,

		// States
		isLoading,
		error,
		isInitialized,

		// Helper functions
		getOrgById,
		hasOrg,
		setActiveOrg,
		refreshOrgs,
		invalidateOrgs,

		// Organization management functions
		firstLoadOrgsData,
		handleOrgBranching,
		validateCurrentOrgAccess,

		// Advanced control
		orgsQuery: workspacesQuery
	};
}

/**
 * Simplified hook to get current organization data only.
 *
 * This provides a lightweight interface for components that only need current org data
 * without access to management functions.
 *
 * @returns {Object} An object containing only current organization data and states
 * @returns {TWorkspace | null} returns.currentOrg - The currently active workspace/organization
 * @returns {boolean} returns.isLoading - Loading state for organizations data
 * @returns {Error | null} returns.error - Error state if any
 *
 * @example
 * ```typescript
 * function OrgHeader() {
 *   const { currentOrg, isLoading, error } = useCurrentOrgOnly();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error loading organization</div>;
 *
 *   return <h1>{currentOrg?.name || 'No Organization'}</h1>;
 * }
 * ```
 */
export function useCurrentOrgOnly() {
	const { currentOrg, isLoading, error } = useCurrentOrg();

	return {
		currentOrg,
		isLoading,
		error
	};
}
