import { deleteUserAPI, resetUserAPI } from '@app/services/client/api';
import { useCallback } from 'react';
import { useQuery } from '../useQuery';
import { useAuthenticateUser } from './useAuthenticateUser';

export const useUser = () => {
	const { user, logOut } = useAuthenticateUser();

	const { loading: deleteUserLoading, queryCall: deleteQueryCall } =
		useQuery(deleteUserAPI);

	const { loading: resetUserLoading, queryCall: resetQueryCall } =
		useQuery(resetUserAPI);

	const deleteUser = useCallback(() => {
		if (user) {
			return deleteQueryCall(user.id).then((res) => {
				logOut();
				return res;
			});
		}
	}, [user]);

	const resetUser = useCallback(() => {
		if (user) {
			return resetQueryCall().then((res) => {
				logOut();
				return res;
			});
		}
	}, [user]);

	return {
		deleteUser,
		deleteUserLoading,
		deleteQueryCall,
		resetUser,
		resetUserLoading,
		resetQueryCall
	};
};
