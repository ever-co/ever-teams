'use client';
import { DEFAULT_APP_PATH, LAST_WORKSPACE_AND_TEAM } from '@/core/constants/config/constants';
import { removeAuthCookies } from '@/core/lib/helpers/cookies';
import { activeTeamManagersState, activeTeamState, userState } from '@/core/stores';
import { useCallback, useMemo, useRef, useEffect } from 'react';
import { useAtom, useAtomValue } from 'jotai';
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
	const [user, setUser] = useAtom(userState);
	const $user = useRef<TUser | null>(defaultUser || null);
	const intervalRt = useRef(0);
	const activeTeam = useAtomValue(activeTeamState);
	const queryClient = useQueryClient();

	const { isTeamManager } = useIsMemberManager(user);

	const userDataQuery = useUserQuery();

	const refreshTokenMutation = useMutation({
		mutationKey: queryKeys.users.auth.refreshToken,
		mutationFn: async () => {
			return await authService.refreshToken();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.users.me });
		},
		onError: () => {
			toast.error('Failed to refresh token');
		},
		retry: 1,
		gcTime: 0
	});

	useEffect(() => {
		if (userDataQuery.data && userDataQuery.data !== user) {
			if (!user || userDataQuery.data.id !== user.id || userDataQuery.data.updatedAt !== user.updatedAt) {
				setUser(userDataQuery.data);
			}
		}
	}, [userDataQuery.data, user, setUser]);

	const refreshUserLoading = useMemo(() => {
		return userDataQuery.isFetching || refreshTokenMutation.isPending;
	}, [userDataQuery.isFetching, refreshTokenMutation.isPending]);

	const updateUserFromAPI = useCallback(() => {
		if (userDataQuery.isFetching) {
			return;
		}
		userDataQuery.refetch().then((result) => {
			if (result.data) {
				setUser(result.data);
			}
		});
	}, [userDataQuery, setUser]);

	$user.current = useMemo(() => {
		return user || $user.current;
	}, [user]);

	const logOut = useCallback(() => {
		window && window?.localStorage.setItem(LAST_WORKSPACE_AND_TEAM, activeTeam?.id ?? '');
		removeAuthCookies();
		window.clearInterval(intervalRt.current);
		queryClient.clear();
		window.location.replace(DEFAULT_APP_PATH);
	}, [activeTeam?.id, queryClient]);

	const timeToTimeRefreshToken = useCallback(
		(interval = 3000 * 60) => {
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
		updateUserFromAPI,
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

	const isManagerConnectedUser = activeTeamManagers.findIndex((member) => member.employee?.user?.id == user?.id);
	return profile.userProfile?.id === user?.id || isManagerConnectedUser != -1;
};
