'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { workspaceService } from '@/core/services/client/api/auth';
import {
	workspacesState,
	activeWorkspaceIdState,
	workspacesLoadingState,
	workspacesErrorState,
	currentWorkspaceState,
	hasMultipleWorkspacesState,
	workspacesInitializedState
} from '@/core/stores/auth';
import { TWorkspace } from '@/core/types/schemas/team/organization-team.schema';
import { getAccessTokenCookie } from '@/core/lib/helpers/cookies';
import { queryKeys } from '@/core/query/keys';
import { useAuthenticateUser } from './use-authenticate-user';
import { useFirstLoad } from '../common/use-first-load';

/**
 * Hook for managing user workspaces
 */
export function useWorkspaces() {
	const [workspaces, setWorkspaces] = useAtom(workspacesState);
	const [activeWorkspaceId, setActiveWorkspaceId] = useAtom(activeWorkspaceIdState);
	const [isLoading, setIsLoading] = useAtom(workspacesLoadingState);
	const [error, setError] = useAtom(workspacesErrorState);
	const [isInitialized, setIsInitialized] = useAtom(workspacesInitializedState);
	const currentWorkspace = useAtomValue(currentWorkspaceState);
	const { user } = useAuthenticateUser();
	const hasMultipleWorkspaces = useAtomValue(hasMultipleWorkspacesState);

	const queryClient = useQueryClient();
	const { firstLoadData: firstLoadWorkspacesData } = useFirstLoad();

	// Check if user is authenticated
	const isAuthenticated = useCallback(() => {
		return !!getAccessTokenCookie();
	}, []);

	// Query to retrieve workspaces
	const workspacesQuery = useQuery({
		queryKey: queryKeys.auth.workspaces(user?.id),
		queryFn: async () => {
			setIsLoading(true);
			setError(null);
			try {
				const result = await workspaceService.getUserWorkspaces(user);
				return result;
			} catch (err: any) {
				setError(err.message || 'Error retrieving workspaces');
				throw err;
			} finally {
				setIsLoading(false);
			}
		},
		enabled: isAuthenticated() && !!user?.id,
		// Intelligent cache configuration
		staleTime: 1000 * 60 * 15, // 15 minutes - workspaces don't change often
		gcTime: 1000 * 60 * 60, // 1 hour - keep in memory longer
		refetchOnWindowFocus: false, // Don't refetch on focus to avoid unnecessary requests
		refetchOnReconnect: true, // Refetch when connection is restored
		refetchOnMount: false, // Use cached data on mount if available
		// Stale-while-revalidate behavior
		refetchInterval: 1000 * 60 * 30, // Background refresh every 30 minutes
		refetchIntervalInBackground: false, // Only when tab is active
		retry: (failureCount, error: any) => {
			// Smart retry logic
			if (error?.status === 401 || error?.status === 403) {
				return false; // Don't retry auth errors
			}
			return failureCount < 3; // Max 3 retries for other errors
		},
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000) // Exponential backoff
	});

	// Update the store when the data changes
	useEffect(() => {
		if (workspacesQuery.data) {
			setWorkspaces(workspacesQuery.data);

			// If no active workspace is defined, take the first one
			if (!activeWorkspaceId && workspacesQuery.data.length > 0) {
				const activeWorkspace = workspacesQuery.data[0]; // No isActive field in API, use first workspace
				setActiveWorkspaceId(activeWorkspace.user.tenant.id);
			}

			setIsInitialized(true);
		}
	}, [workspacesQuery.data, activeWorkspaceId, setWorkspaces, setActiveWorkspaceId, setIsInitialized]);

	// Update the loading state
	useEffect(() => {
		setIsLoading(workspacesQuery.isFetching);
	}, [workspacesQuery.isFetching, setIsLoading]);

	// Update the error state
	useEffect(() => {
		if (workspacesQuery.error) {
			setError(workspacesQuery.error.message || 'Error retrieving workspaces');
		}
	}, [workspacesQuery.error, setError]);

	/**
	 * Refresh the workspaces
	 */
	const refreshWorkspaces = useCallback(async () => {
		await workspacesQuery.refetch();
	}, [workspacesQuery]);

	/**
	 * Set the active workspace
	 */
	const setActiveWorkspace = useCallback(
		(workspaceId: string) => {
			const workspace = workspaces.find((w) => w.user.tenant.id === workspaceId);
			if (workspace) {
				setActiveWorkspaceId(workspaceId);
				// Note: No need to update isActive state since API doesn't provide it
				// The active state is managed by activeWorkspaceId only
			}
		},
		[workspaces, setActiveWorkspaceId]
	);

	/**
	 * Get a workspace by ID
	 */
	const getWorkspaceById = useCallback(
		(workspaceId: string): TWorkspace | undefined => {
			return workspaces.find((w) => w.user.tenant.id === workspaceId);
		},
		[workspaces]
	);

	/**
	 * Check if a workspace exists
	 */
	const hasWorkspace = useCallback(
		(workspaceId: string): boolean => {
			return workspaces.some((w) => w.user.tenant.id === workspaceId);
		},
		[workspaces]
	);

	/**
	 * Get inactive workspaces
	 */
	const inactiveWorkspaces = useMemo(() => {
		return workspaces.filter((w) => w.user.tenant.id !== activeWorkspaceId);
	}, [workspaces, activeWorkspaceId]);

	/**
	 * Invalidate the cache of workspaces
	 */
	const invalidateWorkspaces = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: queryKeys.auth.workspaces(user?.id) });
	}, [queryClient, user?.id]);

	return {
		// Data
		workspaces,
		currentWorkspace,
		activeWorkspaceId,
		inactiveWorkspaces,

		// States
		isLoading,
		error,
		isInitialized,
		hasMultipleWorkspaces,

		// Actions
		refreshWorkspaces,
		setActiveWorkspace,
		getWorkspaceById,
		hasWorkspace,
		invalidateWorkspaces,

		// FirstLoad function for InitState
		firstLoadWorkspacesData,

		// Query object for advanced control
		workspacesQuery
	};
}

/**
 * Hook to get the current workspace only
 */
export function useCurrentWorkspace() {
	const { currentWorkspace, isLoading, error } = useWorkspaces();

	return {
		currentWorkspace,
		isLoading,
		error
	};
}
