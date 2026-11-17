import { apiConfigManager, getUser } from '@ever-teams/api';
import { useEffect } from 'react';
import { IHookResponse, IUser } from '@ever-teams/toolkit-types';
import { useAtom, useSetAtom } from 'jotai';
import { selectedEmployeeAtom, userAtom } from '../teams-jotai/atoms/teams-atoms';
import { kindOfFailedRequest, noticeOfAnswer } from '@lib/errors/kit-error';
import { kitNoticeAtom } from '@lib/errors/kit-notice-atom';
import { errorMessageOf } from '@lib/context/teams-timer-status-context';

// Helper function to update session
export const updateSession = (user: IUser, token: string) => {
	if (typeof window !== 'undefined') {
		const dayInMilliSeconds: number = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
		const expiryTime = Date.now() + dayInMilliSeconds;
		const _teamsStore = {
			app: { user },
			persist: { token, expiry: expiryTime }
		};

		localStorage.setItem('_teams-store', JSON.stringify(_teamsStore));
	}
};

const useAuthUser = (token: string): IHookResponse<IUser> => {
	const [user, setUser] = useAtom(userAtom);
	const [, setSelectedEmployee] = useAtom(selectedEmployeeAtom);
	const setNotice = useSetAtom(kitNoticeAtom);

	const handleUserAuthentication = async () => {
		try {
			if (!token) {
				return;
			}

			// If we have user data in state and token is NOT from env, update session but don't fetch
			if (user.data && !user.loading) {
				updateSession(user.data, token);
				return;
			}

			setUser((prev) => ({ ...prev, loading: true }));

			const authUser = await getUser({ token, includeEmployee: true, includeOrganization: true });

			if ('message' in authUser || 'error' in authUser) {
				setUser((prev) => ({ ...prev, loading: false }));
				// A stored session the API refuses (401) shows "Your session ended" in the widgets, not a toast on the page.
				if ('statusCode' in authUser) {
					setNotice(noticeOfAnswer(authUser, errorMessageOf(authUser)));
					return;
				}
				setNotice({ kind: await kindOfFailedRequest(apiConfigManager.getConfig().apiUrl) });
				return;
			}

			if (authUser.employee?.id) {
				setSelectedEmployee(authUser.employee.id);
			}

			setUser({ data: authUser, loading: false });
			updateSession(authUser, token);
		} catch {
			setNotice({ kind: await kindOfFailedRequest(apiConfigManager.getConfig().apiUrl) });
			setUser((prev) => ({ ...prev, loading: false }));
		}
	};

	useEffect(() => {
		handleUserAuthentication();
	}, [token]);

	return user;
};

export { useAuthUser };
