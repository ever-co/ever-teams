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

	// Check if user is authenticated
	const isAuthenticated = useCallback(() => {
		return !!getAccessTokenCookie();
	}, []);

	// Query to retrieve workspaces
	const workspacesQuery = useQuery({
		queryKey: queryKeys.auth.workspaces,
		queryFn: async () => {
			setIsLoading(true);
			setError(null);
			try {
				const result = await workspaceService.getUserWorkspaces(user);
				console.log('result Workspaces', result);
				console.log('result Workspaces length:', result.length);
				console.log('result Workspaces type:', typeof result);
				return result;
			} catch (err: any) {
				setError(err.message || 'Error retrieving workspaces');
				throw err;
			} finally {
				setIsLoading(false);
			}
		},
		enabled: isAuthenticated(),
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 10, // 10 minutes
		refetchOnWindowFocus: false,
		refetchOnReconnect: true,
		retry: 2
	});

	// Update the store when the data changes
	useEffect(() => {
		console.log('useWorkspaces effect - workspacesQuery.data:', workspacesQuery.data);
		if (workspacesQuery.data) {
			console.log('Setting workspaces in store:', workspacesQuery.data);
			setWorkspaces(workspacesQuery.data);

			// If no active workspace is defined, take the first one
			if (!activeWorkspaceId && workspacesQuery.data.length > 0) {
				const activeWorkspace = workspacesQuery.data.find((w) => w.isActive) || workspacesQuery.data[0];
				console.log('Setting active workspace:', activeWorkspace.id);
				setActiveWorkspaceId(activeWorkspace.id);
			}

			setIsInitialized(true);
		}
	}, [workspacesQuery.data, activeWorkspaceId, setWorkspaces, setActiveWorkspaceId, setIsInitialized]);

	// Update the loading state
	useEffect(() => {
		console.log('useWorkspaces loading state - isFetching:', workspacesQuery.isFetching);
		console.log('useWorkspaces query state:', {
			isLoading: workspacesQuery.isLoading,
			isFetching: workspacesQuery.isFetching,
			isError: workspacesQuery.isError,
			error: workspacesQuery.error,
			data: workspacesQuery.data
		});
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
			const workspace = workspaces.find((w) => w.id === workspaceId);
			if (workspace) {
				setActiveWorkspaceId(workspaceId);
				// Update the isActive state of the workspaces
				const updatedWorkspaces = workspaces.map((w) => ({
					...w,
					isActive: w.id === workspaceId
				}));
				setWorkspaces(updatedWorkspaces);
			}
		},
		[workspaces, setActiveWorkspaceId, setWorkspaces]
	);

	/**
	 * Get a workspace by ID
	 */
	const getWorkspaceById = useCallback(
		(workspaceId: string): TWorkspace | undefined => {
			return workspaces.find((w) => w.id === workspaceId);
		},
		[workspaces]
	);

	/**
	 * Check if a workspace exists
	 */
	const hasWorkspace = useCallback(
		(workspaceId: string): boolean => {
			return workspaces.some((w) => w.id === workspaceId);
		},
		[workspaces]
	);

	/**
	 * Get inactive workspaces
	 */
	const inactiveWorkspaces = useMemo(() => {
		return workspaces.filter((w) => w.id !== activeWorkspaceId);
	}, [workspaces, activeWorkspaceId]);

	/**
	 * Invalidate the cache of workspaces
	 */
	const invalidateWorkspaces = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: queryKeys.auth.workspaces });
	}, [queryClient]);

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
