'use client';
import { DEFAULT_APP_PATH, LAST_WORKSPACE_AND_TEAM } from '@/core/constants/config/constants';
import { removeAuthCookies } from '@/core/lib/helpers/cookies';
import { forgetThisBrowserPush } from '@/core/hooks/inbox/use-inbox-web-push';
import { handleUnauthorized } from '@/core/lib/auth/handle-unauthorized';
import { DisconnectionReason } from '@/core/types/enums/disconnection-reason';
import { logDisconnection } from '@/core/lib/auth/disconnect-logger';
import { isUnauthorizedError } from '@/core/lib/auth/retry-logic';
import { activeTeamState, timerStatusState, userDetailAccordion, userState } from '@/core/stores';
import { useCallback, useMemo, useRef } from 'react';
import { useSetAtom, useAtomValue, useStore } from 'jotai';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { authService } from '@/core/services/client/api/auth/auth.service';
import { timerService } from '@/core/services/client/api/timers';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { isRunningTeamsLog } from '@/core/lib/helpers/timer-policy';
import { useIsListedTeamManager, useIsMemberManager } from '../organizations/teams/use-team-member';
import { useActiveTeamMemberUserId } from '../organizations/teams/use-active-team-member';
import { useParams } from 'next/navigation';
import { TUser } from '@/core/types/schemas';
import { queryKeys } from '@/core/query/keys';
import { toast } from 'sonner';
import { UseAuthenticateUserResult } from '@/core/types/interfaces/user/user';
import { useUserQuery } from '../queries/user-user.query';
import { logErrorInDev, logInDev } from '@/core/lib/helpers/error-message';
import { clearChatHistoryForUser } from '@/core/components/features/chat-panel/chat-history';
import { runSignOutCleanups } from '@/core/lib/auth/sign-out-cleanups';
import { rememberTeam } from '@/core/lib/auth/remembered-team';

export const useAuthenticateUser = (defaultUser?: TUser): UseAuthenticateUserResult => {
	const userDataQuery = useUserQuery();
	const user = userDataQuery.data;
	const setUser = useSetAtom(userState);
	const $user = useRef<TUser | null>(defaultUser || user || null);
	const activeTeam = useAtomValue(activeTeamState);
	// Read at logout time only: subscribing to the timer status would re-render every caller of this hook.
	const store = useStore();
	const queryClient = useQueryClient();
	const t = useTranslations();

	const { isTeamManager } = useIsMemberManager(user);

	const refreshTokenMutation = useMutation({
		mutationKey: queryKeys.users.auth.refreshToken,
		mutationFn: async () => {
			return await authService.refreshToken();
		},
		onSuccess: () => {
			logInDev('[Auth] ✅ Token refreshed successfully');
			queryClient.invalidateQueries({ queryKey: queryKeys.users.me });
		},
		onError: (error: unknown) => {
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
				toast.error(t('toasts.auth.SESSION_ENDED'));
				handleUnauthorized(DisconnectionReason.REFRESH_TOKEN_EXPIRED, details);
				return;
			}

			// A renewal that could not be made (no network, a server error) says nothing about the session: it is
			// kept, however many times in a row that happens. Only a refused refresh token ends it, above.
			console.warn('[Auth] ⚠️ Token refresh failed:', (error as Error)?.message);
		},
		retry: 1,
		gcTime: 0
	});
	// Stable function ref: the useMutation RESULT object is recreated on every state change (idle → pending →
	// success). Depending on it made refreshUserData/refreshToken new on every render. mutateAsync is bound
	// once and safe to depend on.
	const refreshTokenMutateAsync = refreshTokenMutation.mutateAsync;

	const refreshUserLoading = useMemo(() => {
		return userDataQuery.isFetching || refreshTokenMutation.isPending;
	}, [userDataQuery.isFetching, refreshTokenMutation.isPending]);

	/**
	 * Reads the user again from the API.
	 *
	 * An expired access token is no concern of this read: the API service renews the session and sends a refused
	 * request again (api.service.ts handleUnauthorized), this one like any other.
	 */
	const refreshUserData = useCallback(async () => {
		const result = await userDataQuery.refetch();
		if (result.data) {
			setUser(result.data);
			return result.data;
		}
		if (result.isError && result.error) {
			throw result.error;
		}
	}, [userDataQuery, setUser]);

	$user.current = useMemo(() => {
		return user || $user.current;
	}, [user]);

	const logOut = useCallback(async () => {
		// Log the intentional logout
		logDisconnection(DisconnectionReason.USER_LOGOUT, {
			userId: user?.id,
			email: user?.email
		});

		// Blocked or full browser storage must not stop the sign-out: the session would stay open without a word
		try {
			window?.localStorage.setItem(LAST_WORKSPACE_AND_TEAM, activeTeam?.id ?? '');
		} catch (error) {
			logErrorInDev('[Auth] Last team not stored before logout:', error);
		}
		rememberTeam(user?.email, activeTeam?.id);
		clearChatHistoryForUser(user?.id);
		// What the features keep of this account in memory (unsaved Docs text) goes with the session.
		runSignOutCleanups();

		// A TEAMS timer left running would keep counting after logout: stop it while the session still
		// exists, without letting a failed or slow request hold the logout back. Past the server's midnight
		// the status reads stopped while the last log still runs (useTimerRunningPastMidnight): check it too.
		const timerStatus = store.get(timerStatusState);
		const pastMidnightLog = timerStatus?.running
			? null
			: queryClient.getQueryData<ITimeLog | null>(queryKeys.timer.lastLog(user?.employee?.id));
		if (
			(timerStatus?.running && timerStatus.lastLog?.source === ETimeLogSource.TEAMS) ||
			isRunningTeamsLog(pastMidnightLog)
		) {
			const stopTimer = timerService
				.stopTimer({ source: ETimeLogSource.TEAMS })
				.catch((error) => logErrorInDev('[Auth] Timer stop before logout failed:', error));
			await Promise.race([stopTimer, new Promise((resolve) => window.setTimeout(resolve, 3000))]);
		}

		// This browser stops receiving the person's inbox notifications (a shared browser), bounded like the timer stop.
		await Promise.race([forgetThisBrowserPush(), new Promise((resolve) => window.setTimeout(resolve, 3000))]);

		removeAuthCookies();
		queryClient.clear();
		window?.location.replace(DEFAULT_APP_PATH);
	}, [activeTeam?.id, queryClient, store, user?.id, user?.email, user?.employee?.id]);

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
	const isConnectedUserManager = useIsListedTeamManager(user?.id);
	// The profile shown, as useUserProfilePage resolves it, read without that page-level hook: this one runs in every
	// task card and member row
	const params = useParams();
	const accordionMemberId = useAtomValue(userDetailAccordion);
	const memberId = (params?.memberId ?? accordionMemberId) as string;
	const isAuthUserProfile = user?.employee?.userId === memberId;
	const memberUserId = useActiveTeamMemberUserId(memberId);
	let profileUserId = memberUserId;
	if (isAuthUserProfile) {
		profileUserId = user?.id;
	}

	return profileUserId === user?.id || isConnectedUserManager;
};
