'use client';
import { DEFAULT_APP_PATH, LAST_WORKSPACE_AND_TEAM } from '@/core/constants/config/constants';
import { removeAuthCookies } from '@/core/lib/helpers/cookies';
import { handleUnauthorized, registerRefreshTokenCallback } from '@/core/lib/auth/handle-unauthorized';
import { DisconnectionReason } from '@/core/types/enums/disconnection-reason';
import { logDisconnection } from '@/core/lib/auth/disconnect-logger';
import { isUnauthorizedError } from '@/core/lib/auth/retry-logic';
import { activeTeamManagersState, activeTeamState, userState } from '@/core/stores';
import { useCallback, useMemo, useRef, useEffect } from 'react';
import { useSetAtom, useAtomValue } from 'jotai';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { authService } from '@/core/services/client/api/auth/auth.service';
import { useIsMemberManager } from '../organizations';
import { useUserProfilePage } from '../users';
import { TUser } from '@/core/types/schemas';
import { queryKeys } from '@/core/query/keys';
import { toast } from 'sonner';
import { UseAuthenticateUserResult } from '@/core/types/interfaces/user/user';
import { useUserQuery } from '../queries/user-user.query';
import { logErrorInDev } from '@/core/lib/helpers/error-message';
import { clearChatHistoryForUser } from '@/core/components/features/chat-panel/chat-history';

export const useAuthenticateUser = (defaultUser?: TUser): UseAuthenticateUserResult => {
	const userDataQuery = useUserQuery();
	const user = userDataQuery.data;
	const setUser = useSetAtom(userState);
	const $user = useRef<TUser | null>(defaultUser || user || null);
	const activeTeam = useAtomValue(activeTeamState);
	const queryClient = useQueryClient();

	// Track consecutive refresh failures for smarter error handling
	const consecutiveFailures = useRef(0);
	const maxConsecutiveFailures = 3; // Allow 3 failures before logout

	const { isTeamManager } = useIsMemberManager(user);

	const refreshTokenMutation = useMutation({
		mutationKey: queryKeys.users.auth.refreshToken,
		mutationFn: async () => {
			return await authService.refreshToken();
		},
		onSuccess: () => {
			consecutiveFailures.current = 0;
			console.log('[Auth] ✅ Token refreshed successfully');
			queryClient.invalidateQueries({ queryKey: queryKeys.users.me });
		},
		onError: (error: unknown) => {
			consecutiveFailures.current += 1;

			const isUnauthorized = isUnauthorizedError(error);

			// Use the utility function for consistent 401 detection
			if (isUnauthorized) {
				const details = {
					status: 401,
					endpoint: (error as any).config?.url,
					method: (error as any).config?.method,
					context: 'useAuthenticateUser -> refreshTokenMutation (401)'
				};
				logErrorInDev('[Auth] ❌ Refresh token rejected (401) - session expired', details);
				toast.error('Session expired. Please log in again.');
				handleUnauthorized(DisconnectionReason.REFRESH_TOKEN_EXPIRED, details);
				return;
			}

			// Network or server errors - allow retries
			if (consecutiveFailures.current >= maxConsecutiveFailures) {
				const details = {
					consecutiveFailures: consecutiveFailures.current,
					maxConsecutiveFailures,
					error: (error as Error)?.message,
					stack: (error as Error)?.stack,
					context: 'useAuthenticateUser -> refreshTokenMutation (max retries)'
				};
				logErrorInDev(`[Auth] ❌ Refresh failed ${maxConsecutiveFailures} times - logging out`, details);
				toast.error('Unable to refresh session. Please log in again.');
				handleUnauthorized(DisconnectionReason.TEMPORARY_ERROR, details);
			} else {
				console.warn(
					`[Auth] ⚠️ Refresh attempt ${consecutiveFailures.current}/${maxConsecutiveFailures} failed:`,
					error
				);
				toast.warning(
					`Connection issue. Retrying... (${consecutiveFailures.current}/${maxConsecutiveFailures})`
				);
			}
		},
		retry: 1,
		gcTime: 0
	});
	// Stable function ref: the useMutation RESULT object is recreated on every state change (idle → pending →
	// success). Depending on it made refreshUserData/refreshToken new on every render. mutateAsync is bound
	// once and safe to depend on.
	const refreshTokenMutateAsync = refreshTokenMutation.mutateAsync;

	useEffect(() => {
		if (userDataQuery.data && userDataQuery.isFetched && userDataQuery.data !== user) {
			if (!user || userDataQuery.data.id !== user.id || userDataQuery.data.updatedAt !== user.updatedAt) {
				setUser(userDataQuery.data);
			}
		}
	}, [userDataQuery.data, user, setUser]);

	const refreshUserLoading = useMemo(() => {
		return userDataQuery.isFetching || refreshTokenMutation.isPending;
	}, [userDataQuery.isFetching, refreshTokenMutation.isPending]);

	/**
	 * Manually refresh user data with graceful token recovery
	 *
	 * Pattern: "Optimistic Recovery with Cancellation"
	 * 1. Try to fetch user data
	 * 2. If 401, attempt token refresh within the debounce window
	 * 3. If refresh succeeds, cancel pending logout and retry fetch
	 * 4. If refresh fails, logout proceeds normally
	 */
	const refreshUserData = useCallback(async () => {
		const result = await userDataQuery.refetch();
		if (result.data) {
			setUser(result.data);
			return result.data;
		}
		if (result.isError && result.error) {
			const error = result.error as any;
			if (error?.response?.status === 401 || error?.status === 401) {
				try {
					await refreshTokenMutateAsync();
					const retryResult = await userDataQuery.refetch();
					if (retryResult.data) {
						setUser(retryResult.data);
						return retryResult.data;
					}
				} catch (refreshError) {
					logErrorInDev('Failed to refresh token:', refreshError);
					throw refreshError;
				}
			}
			throw error;
		}
	}, [userDataQuery, setUser, refreshTokenMutateAsync]);

	// Register the refresh callback so handleUnauthorized can attempt token refresh on 401
	// The registerRefreshTokenCallback returns an unregister function that removes THIS specific callback
	// This prevents the race condition where unmounting one component clears callbacks for others
	useEffect(() => {
		const unregister = registerRefreshTokenCallback(refreshUserData);

		return () => {
			// Call the returned unregister function to remove THIS specific callback
			unregister();
		};
	}, [refreshUserData]);

	$user.current = useMemo(() => {
		return user || $user.current;
	}, [user]);

	const logOut = useCallback(() => {
		// Log the intentional logout
		logDisconnection(DisconnectionReason.USER_LOGOUT, {
			userId: user?.id,
			email: user?.email
		});

		window?.localStorage.setItem(LAST_WORKSPACE_AND_TEAM, activeTeam?.id ?? '');
		clearChatHistoryForUser(user?.id);
		removeAuthCookies();
		queryClient.clear();
		window?.location.replace(DEFAULT_APP_PATH);
	}, [activeTeam?.id, queryClient, user?.id, user?.email]);

	const refreshToken = useCallback(async (): Promise<void> => {
		await refreshTokenMutateAsync();
	}, [refreshTokenMutateAsync]);

	return {
		$user,
		user: $user.current,
		userLoading: userDataQuery.isFetching,
		setUser,
		isTeamManager,
		refreshUserData,
		refreshUserLoading,
		logOut,
		refreshToken,

		userDataQuery,
		refreshTokenMutation
	};
};
/**
 * A hook to check if the current user is a manager or whom the current profile belongs to
 *
 * @description  We need, especially for the user profile page, to know if the current user can see some activities, or interact with data
 * @returns a boolean that defines in the user is authorized
 */

export const useCanSeeActivityScreen = () => {
	const { data: user } = useUserQuery();
	const activeTeamManagers = useAtomValue(activeTeamManagersState);

	const profile = useUserProfilePage();

	const isManagerConnectedUser = activeTeamManagers.findIndex((member) => member.employee?.user?.id === user?.id);
	return profile.userProfile?.id === user?.id || isManagerConnectedUser !== -1;
};
