import { useCallback } from 'react';
import { useQuery } from '../common/use-query';
import { userService } from '@/core/services/client/api';
import { useAuthenticateUser } from '../auth';

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
