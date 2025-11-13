'use client';
import { DEFAULT_APP_PATH, LAST_WORKSPACE_AND_TEAM } from '@/core/constants/config/constants';
import { removeAuthCookies } from '@/core/lib/helpers/cookies';
import { handleUnauthorized, registerRefreshTokenCallback } from '@/core/lib/auth/handle-unauthorized';
import { DisconnectionReason } from '@/core/types/enums/disconnection-reason';
import { logDisconnection } from '@/core/lib/auth/disconnect-logger';
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

export const useAuthenticateUser = (defaultUser?: TUser): UseAuthenticateUserResult => {
	const userDataQuery = useUserQuery();
	const user = userDataQuery.data;
	const setUser = useSetAtom(userState);
	const $user = useRef<TUser | null>(defaultUser || user || null);
	const intervalRt = useRef(0);
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
			queryClient.invalidateQueries({ queryKey: queryKeys.users.me });
		},
		onError: (error: any) => {
			consecutiveFailures.current += 1;

			const isUnauthorized = error?.response?.status === 401 || error?.status === 401;

			if (isUnauthorized) {
				toast.error('Session expired. Please log in again.');
				handleUnauthorized(DisconnectionReason.REFRESH_TOKEN_EXPIRED, {
					status: 401,
					endpoint: error.config?.url,
					method: error.config?.method,
					context: 'useAuthenticateUser -> refreshTokenMutation 1'
				});
				return;
			}

			if (consecutiveFailures.current >= maxConsecutiveFailures) {
				toast.error('Unable to refresh session. Please log in again.');
				handleUnauthorized(DisconnectionReason.TEMPORARY_ERROR, {
					consecutiveFailures: consecutiveFailures.current,
					maxConsecutiveFailures,
					error: error?.message,
					stack: error?.stack,
					context: 'useAuthenticateUser -> refreshTokenMutation 2'
				});
			} else {
				toast.warning(
					`Connection issue. Retrying... (${consecutiveFailures.current}/${maxConsecutiveFailures})`
				);
			}
		},
		retry: 1,
		gcTime: 0
	});

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
					await refreshTokenMutation.mutateAsync();
					const retryResult = await userDataQuery.refetch();
					if (retryResult.data) {
						setUser(retryResult.data);
						return retryResult.data;
					}
				} catch (refreshError) {
					console.error('Failed to refresh token:', refreshError);
					throw refreshError;
				}
			}
			throw error;
		}
	}, [userDataQuery, setUser, refreshTokenMutation]);

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

		window && window?.localStorage.setItem(LAST_WORKSPACE_AND_TEAM, activeTeam?.id ?? '');
		removeAuthCookies();
		window.clearInterval(intervalRt.current);
		queryClient.clear();
		window.location.replace(DEFAULT_APP_PATH);
	}, [activeTeam?.id, queryClient, user?.id, user?.email]);

	const timeToTimeRefreshToken = useCallback(
		(interval = 10 * 60 * 1000) => {
			// 10 minutes (600000ms) - Reduced from 3 minutes to decrease API calls by 70%
			window.clearInterval(intervalRt.current);
			intervalRt.current = window.setInterval(() => {
				refreshTokenMutation.mutate();
			}, interval);

			return () => {
				window.clearInterval(intervalRt.current);
			};
		},
		[refreshTokenMutation]
	);

	const refreshToken = useCallback(async (): Promise<void> => {
		await refreshTokenMutation.mutateAsync();
	}, [refreshTokenMutation]);

	return {
		$user,
		user: $user.current,
		userLoading: userDataQuery.isFetching,
		setUser,
		isTeamManager,
		refreshUserData,
		refreshUserLoading,
		logOut,
		timeToTimeRefreshToken,
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
