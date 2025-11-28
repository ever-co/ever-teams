'use client';
import { DEFAULT_APP_PATH, LAST_WORKSPACE_AND_TEAM } from '@/core/constants/config/constants';
import { getAccessTokenCookie, getRefreshTokenCookie, removeAuthCookies } from '@/core/lib/helpers/cookies';
import { handleUnauthorized, registerRefreshTokenCallback } from '@/core/lib/auth/handle-unauthorized';
import { DisconnectionReason } from '@/core/types/enums/disconnection-reason';
import { logDisconnection } from '@/core/lib/auth/disconnect-logger';
import {
	calculateRefreshInterval,
	shouldRefreshToken,
	getTokenRemainingTime,
	getTokenLifetime,
	formatRemainingTime
} from '@/core/lib/auth/jwt-utils';
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

export const useAuthenticateUser = (defaultUser?: TUser): UseAuthenticateUserResult => {
	const userDataQuery = useUserQuery();
	const user = userDataQuery.data;
	const setUser = useSetAtom(userState);
	const $user = useRef<TUser | null>(defaultUser || user || null);
	// Ref for the recursive setTimeout-based refresh scheduler
	// Using number type for browser setTimeout (returns number, not NodeJS.Timeout)
	const refreshTimeoutRef = useRef<number | null>(null);
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
					logErrorInDev('Failed to refresh token:', refreshError);
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

		window?.localStorage.setItem(LAST_WORKSPACE_AND_TEAM, activeTeam?.id ?? '');
		removeAuthCookies();
		// Clear the refresh timeout scheduler
		if (refreshTimeoutRef.current) {
			window?.clearTimeout(refreshTimeoutRef.current);
			refreshTimeoutRef.current = null;
		}
		queryClient.clear();
		window?.location.replace(DEFAULT_APP_PATH);
	}, [activeTeam?.id, queryClient, user?.id, user?.email]);

	/**
	 * Start automatic token refresh based on JWT expiration
	 *
	 * Strategy: Refresh at 50% of token lifetime (per OAuth 2.0 best practices)
	 * - For 24h token → refresh every 12h (2 calls/day instead of 144 with 10min interval)
	 * - Minimum: 10 minutes, Maximum: 12 hours
	 *
	 * Uses recursive setTimeout instead of setInterval to recalculate
	 * the refresh interval after each successful refresh (based on new token's expiration)
	 */
	const timeToTimeRefreshToken = useCallback(() => {
		// Clear any existing timeout
		if (refreshTimeoutRef.current) {
			window?.clearTimeout(refreshTimeoutRef.current);
			refreshTimeoutRef.current = null;
		}

		/**
		 * Schedule the next token refresh based on current token's expiration
		 * Uses recursive setTimeout to recalculate interval after each refresh
		 */
		const scheduleNextRefresh = () => {
			const currentToken = getAccessTokenCookie();
			if (!currentToken) {
				console.warn('[Auth] No access token found, stopping refresh scheduler');
				return;
			}

			// Calculate optimal refresh interval based on CURRENT token
			const interval = calculateRefreshInterval(currentToken);
			const remainingTime = getTokenRemainingTime(currentToken);

			console.log(
				`[Auth] Token remaining: ${formatRemainingTime(remainingTime)}, ` +
					`Next refresh in: ${formatRemainingTime(interval / 1000)}`
			);

			refreshTimeoutRef.current =
				window?.setTimeout(async () => {
					const tokenToCheck = getAccessTokenCookie();

					// Guard: Only refresh if actually needed (token might have been refreshed elsewhere)
					// Strategy: If token has more than 50% of its lifetime remaining, someone refreshed it
					// This is consistent with the 50% refresh strategy used in calculateRefreshInterval
					if (!tokenToCheck) {
						console.log('[Auth] Token cleared, stopping scheduler');
						return; // Stop, don't reschedule - user logged out
					}

					const remainingSeconds = getTokenRemainingTime(tokenToCheck);
					const lifetimeSeconds = getTokenLifetime(tokenToCheck);
					// Default to 12h (43200s) if lifetime can't be determined
					const halfLifeSeconds = lifetimeSeconds ? lifetimeSeconds / 2 : 12 * 60 * 60;

					if (remainingSeconds > halfLifeSeconds) {
						// Token has more than 50% life remaining - was refreshed elsewhere (e.g., by proxy.ts)
						console.log(
							`[Auth] Token refreshed elsewhere (${formatRemainingTime(remainingSeconds)} remaining > 50% lifetime), rescheduling...`
						);
						scheduleNextRefresh();
						return;
					}

					console.log('[Auth] Scheduled token refresh triggered');

					try {
						await refreshTokenMutation.mutateAsync();
						// Success: Schedule next refresh with NEW token's interval
						scheduleNextRefresh();
					} catch (error) {
						// Error handling is done in mutation's onError callback
						// Reschedule after a short delay to allow for retry
						logErrorInDev('[Auth] Refresh failed in scheduler, will retry in 30 seconds', error);
						refreshTimeoutRef.current = window?.setTimeout(scheduleNextRefresh, 30000) ?? null;
					}
				}, interval) ?? null;
		};

		// Check if immediate refresh is needed before starting scheduler
		const accessToken = getAccessTokenCookie();
		if (!accessToken) {
			console.warn('[Auth] No access token found, skipping refresh scheduler setup');
			return () => {};
		}

		if (shouldRefreshToken(accessToken, 300)) {
			// Token expires within 5 min - refresh immediately before starting scheduler
			// Using mutate() with callbacks to control scheduler timing (no async/await needed)
			// NOTE: The mutation's onSuccess/onError already handle core logic (reset failures,
			// invalidate queries, 401 detection, etc). These callbacks ONLY add scheduling control.
			console.log('[Auth] Token expired or expiring soon, refreshing immediately...');
			refreshTokenMutation.mutate(undefined, {
				onSuccess: () => {
					// Core success logic handled by mutation's onSuccess
					// Here we ONLY add: start scheduler with the refreshed token
					scheduleNextRefresh();
				},
				onError: () => {
					// Core error logic handled by mutation's onError (401 → logout, network → counter)
					// Here we ONLY add: if still logged in (network error), schedule quick retry
					// Check via refresh token presence - if gone, handleUnauthorized was called
					if (getRefreshTokenCookie()) {
						console.warn('[Auth] Immediate refresh failed (network), scheduling retry in 30s');
						refreshTimeoutRef.current = window?.setTimeout(scheduleNextRefresh, 30000) ?? null;
					}
					// If no refresh token → 401 handled, user logged out, no scheduler needed
				}
			});
		} else {
			// Token is still valid (> 5 min remaining) - start normal scheduler
			scheduleNextRefresh();
		}

		// Return cleanup function
		return () => {
			if (refreshTimeoutRef.current) {
				window?.clearTimeout(refreshTimeoutRef.current);
				refreshTimeoutRef.current = null;
			}
		};
	}, [refreshTokenMutation]);

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
