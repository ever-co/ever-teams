'use client';
import { DEFAULT_APP_PATH, LAST_WORSPACE_AND_TEAM } from '@/core/constants/config/constants';
import { removeAuthCookies } from '@/core/lib/helpers/cookies';
import { activeTeamState, userState } from '@/core/stores';
import { useCallback, useMemo, useRef } from 'react';
import { useAtom, useAtomValue } from 'jotai';

import { useQueryCall } from '../common/use-query';
import { authService } from '@/core/services/client/api/auth/auth.service';
import { userService } from '@/core/services/client/api';
import { useIsMemberManager, useOrganizationTeams } from '../organizations';
import { useUserProfilePage } from '../users';
import { TUser } from '@/core/types/schemas';

export const useAuthenticateUser = (defaultUser?: TUser) => {
	const [user, setUser] = useAtom(userState);
	const $user = useRef(defaultUser);
	const intervalRt = useRef(0);
	const activeTeam = useAtomValue(activeTeamState);

	const { isTeamManager } = useIsMemberManager(user);

	const {
		queryCall: refreshUserQueryCall,
		loading: refreshUserLoading,
		loadingRef: refreshUserLoadingRef
	} = useQueryCall(userService.getAuthenticatedUserData);

	const updateUserFromAPI = useCallback(() => {
		if (refreshUserLoadingRef.current) {
			return;
		}
		refreshUserQueryCall().then((data) => {
			setUser(data);
		});
	}, [refreshUserQueryCall, setUser, refreshUserLoadingRef]);

	$user.current = useMemo(() => {
		return user || $user.current;
	}, [user]);

	const logOut = useCallback(() => {
		window && window?.localStorage.setItem(LAST_WORSPACE_AND_TEAM, activeTeam?.id ?? '');
		removeAuthCookies();
		window.clearInterval(intervalRt.current);
		window.location.replace(DEFAULT_APP_PATH);
	}, [activeTeam?.id]);

	const timeToTimeRefreshToken = useCallback((interval = 3000 * 60) => {
		window.clearInterval(intervalRt.current);
		intervalRt.current = window.setInterval(() => authService.refreshToken(), interval);

		return () => {
			window.clearInterval(intervalRt.current);
		};
	}, []);

	const refreshToken = useCallback(async () => {
		await authService.refreshToken();
	}, []);

	return {
		$user,
		user: $user.current,
		setUser,
		isTeamManager,
		updateUserFromAPI,
		refreshUserLoading,
		logOut,
		timeToTimeRefreshToken,
		refreshToken
	};
};

/**
 * A hook to check if the current user is a manager or whom the current profile belongs to
 *
 * @description  We need, especially for the user profile page, to know if the current user can see some activities, or interact with data
 * @returns a boolean that defines in the user is authorized
 */

export const useCanSeeActivityScreen = () => {
	const { user } = useAuthenticateUser();
	const { activeTeamManagers } = useOrganizationTeams();
	const profile = useUserProfilePage();

	const isManagerConnectedUser = activeTeamManagers.findIndex((member) => member.employee?.user?.id == user?.id);
	return profile.userProfile?.id === user?.id || isManagerConnectedUser != -1;
};
