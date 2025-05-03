import { useCallback } from 'react';
import { useQuery } from '../useQuery';
import { useAuthenticateUser } from './useAuthenticateUser';
import { userService } from '@/core/services/client/api';

export const useUser = () => {
	const { user, logOut } = useAuthenticateUser();

	const { loading: deleteUserLoading, queryCall: deleteQueryCall } = useQuery(userService.deleteUser);

	const { loading: resetUserLoading, queryCall: resetQueryCall } = useQuery(userService.resetUser);

	const deleteUser = useCallback(() => {
		if (user) {
			return deleteQueryCall(user.id).then((res) => {
				logOut();
				return res;
			});
		}
	}, [user, deleteQueryCall, logOut]);

	const resetUser = useCallback(() => {
		if (user) {
			return resetQueryCall().then((res) => {
				logOut();
				return res;
			});
		}
	}, [user, resetQueryCall, logOut]);

	return {
		deleteUser,
		deleteUserLoading,
		deleteQueryCall,
		resetUser,
		resetUserLoading,
		resetQueryCall
	};
};
