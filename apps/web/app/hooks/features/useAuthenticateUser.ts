'use client';

import { DEFAULT_APP_PATH } from '@app/constants';
import { removeAuthCookies } from '@app/helpers/cookies';
import { IUser } from '@app/interfaces/IUserData';
import { getAuthenticatedUserDataAPI, refreshTokenAPI } from '@app/services/client/api/auth';
import { userState } from '@app/stores';
import { useCallback, useMemo, useRef } from 'react';
import { useRecoilState } from 'recoil';

import { useQuery } from '../useQuery';
import { useIsMemberManager } from './useTeamMember';

export const useAuthenticateUser = (defaultUser?: IUser) => {
	const [user, setUser] = useRecoilState(userState);
	const $user = useRef(defaultUser);
	const intervalRt = useRef(0);

	const { isTeamManager } = useIsMemberManager(user);

	const {
		queryCall: refreshUserQueryCall,
		loading: refreshUserLoading,
		loadingRef: refreshUserLoadingRef
	} = useQuery(getAuthenticatedUserDataAPI);

	const updateUserFromAPI = useCallback(() => {
		if (refreshUserLoadingRef.current) {
			return;
		}
		refreshUserQueryCall().then((res) => {
			setUser(res.data);
		});
	}, [refreshUserQueryCall, setUser, refreshUserLoadingRef]);

	$user.current = useMemo(() => {
		return user || $user.current;
	}, [user]);

	const logOut = useCallback(() => {
		removeAuthCookies();
		window.clearInterval(intervalRt.current);
		window.location.replace(DEFAULT_APP_PATH);
	}, []);

	const timeToTimeRefreshToken = useCallback((interval = 3000 * 60) => {
		window.clearInterval(intervalRt.current);
		intervalRt.current = window.setInterval(refreshTokenAPI, interval);

		return () => {
			window.clearInterval(intervalRt.current);
		};
	}, []);

	const refreshToken = useCallback(async () => {
		await refreshTokenAPI();
	}, []);

	return {
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
