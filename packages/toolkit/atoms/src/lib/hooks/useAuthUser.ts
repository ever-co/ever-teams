import { getUser } from '@ever-teams/api';
import { useEffect } from 'react';
import { IHookResponse, IUser } from '@ever-teams/toolkit-types';
import { useAtom } from 'jotai';
import { selectedEmployeeAtom, userAtom } from '../teams-jotai/atoms/teams-atoms';
import { toast } from '@ever-teams/toolkit-ui';

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
				const errorMessage =
					'message' in authUser
						? Array.isArray(authUser.message)
							? authUser.message.join(', ')
							: authUser.message
						: String(authUser.error);

				setUser((prev) => ({ ...prev, loading: false }));

				toast({
					description: errorMessage,
					variant: 'destructive'
				});
				return;
			}

			if (authUser.employee?.id) {
				setSelectedEmployee(authUser.employee.id);
			}

			setUser({ data: authUser, loading: false });
			updateSession(authUser, token);
		} catch (error) {
			toast({
				title: 'Ever Teams Error',
				description: (error as Error).message || 'Unknown Error',
				variant: 'destructive'
			});
			setUser((prev) => ({ ...prev, loading: false }));
		}
	};

	useEffect(() => {
		handleUserAuthentication();
	}, [token]);

	return user;
};

export { useAuthUser };
