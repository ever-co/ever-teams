import { getUser } from '@ever-teams/api';
import { useEffect, useRef, useState } from 'react';
import { IHookResponse, IUser } from '@ever-teams/toolkit-types';
import { useAtom, useSetAtom } from 'jotai';
import { selectedEmployeeAtom, userAtom } from '../teams-jotai/atoms/teams-atoms';
import { kindOfFailedRequest, noticeOfFailure } from '@lib/errors/kit-error';
import { kitNoticeAtom } from '@lib/errors/kit-notice-atom';
import { errorMessageOf } from '@lib/context/teams-timer-status-context';
import { useKitOptions } from '@components/teams-provider/kit-options';
import { apiUrlOf } from '@lib/utils/api-url';

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
	// With the host's getToken the token stays in memory: the session is not written to the browser's storage.
	const { hostSignIn, api } = useKitOptions();
	const keepSession = (data: IUser) => {
		if (hostSignIn) {
			return;
		}
		updateSession(data, token);
	};
	// The read of the user found Ever Teams unreachable: it is read again once the browser is back online or the page
	// comes back to the person, without a reload.
	const [readAgainWhenBack, setReadAgainWhenBack] = useState(false);
	// Only the read started last may set the user, the notice or the read again: one for an earlier token is dropped.
	const latestRead = useRef(0);

	const handleUserAuthentication = async () => {
		latestRead.current += 1;
		const read = latestRead.current;
		const isCurrent = () => read === latestRead.current;
		try {
			if (!token) {
				return;
			}

			// If we have user data in state and token is NOT from env, update session but don't fetch
			if (user.data && !user.loading) {
				keepSession(user.data);
				return;
			}

			setUser((prev) => ({ ...prev, loading: true }));

			const authUser = await getUser({ token, includeEmployee: true, includeOrganization: true }, api);
			if (!isCurrent()) {
				return;
			}

			if ('message' in authUser || 'error' in authUser) {
				setUser((prev) => ({ ...prev, loading: false }));
				// A stored session the API refuses (401) shows "Your session ended" in the widgets, not a toast on the
				// page; a read that got no answer (no status) says whether this site is not allowed or Ever Teams is
				// unreachable.
				const notice = await noticeOfFailure(authUser, errorMessageOf(authUser), apiUrlOf(api));
				if (!isCurrent()) {
					return;
				}
				setNotice(notice);
				setReadAgainWhenBack(notice.kind === 'unreachable');
				return;
			}

			if (authUser.employee?.id) {
				setSelectedEmployee(authUser.employee.id);
			}

			setUser({ data: authUser, loading: false });
			keepSession(authUser);
			// A read that succeeds ends the notice an earlier one left (Ever Teams unreachable while the page loaded).
			setNotice(null);
		} catch {
			const kind = await kindOfFailedRequest(apiUrlOf(api));
			if (!isCurrent()) {
				return;
			}
			setNotice({ kind });
			setReadAgainWhenBack(kind === 'unreachable');
			setUser((prev) => ({ ...prev, loading: false }));
		}
	};

	useEffect(() => {
		setReadAgainWhenBack(false);
		void handleUserAuthentication();
	}, [token, api]);

	useEffect(() => {
		if (!readAgainWhenBack) {
			return;
		}
		const readAgain = () => {
			if (document.visibilityState === 'hidden') {
				return;
			}
			setReadAgainWhenBack(false);
			void handleUserAuthentication();
		};
		window.addEventListener('online', readAgain);
		window.addEventListener('focus', readAgain);
		document.addEventListener('visibilitychange', readAgain);
		return () => {
			window.removeEventListener('online', readAgain);
			window.removeEventListener('focus', readAgain);
			document.removeEventListener('visibilitychange', readAgain);
		};
	}, [readAgainWhenBack, token, api]);

	return user;
};

export { useAuthUser };
