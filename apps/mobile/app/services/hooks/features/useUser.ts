import { useCallback, useEffect, useState } from 'react';
import { useStores } from '../../../models';
import { useFetchOrganizationUsers } from '../../client/queries/user/user';
import { deleteUserRequest } from '../../client/requests/user';
import { IUser } from '../../interfaces/IUserData';
import useAuthenticateUser from './useAuthentificateUser';
import { resentVerifyUserLinkRequest } from '../../client/requests/auth';
import { emailResetRequest, verifyChangemailRequest } from '../../client/requests/email-reset';

export function useUser() {
	const {
		authenticationStore: { authToken, tenantId }
	} = useStores();
	const { logOut } = useAuthenticateUser();
	const [allUsers, setAllUsers] = useState<IUser[]>();
	const { data, isLoading } = useFetchOrganizationUsers({ authToken, tenantId });

	const deleteUser = useCallback(async (userId: string) => {
		const { response } = await deleteUserRequest({
			id: userId,
			bearer_token: authToken,
			tenantId
		});

		if (response.ok) {
			logOut();
		}
	}, []);

	const changeUserEmail = useCallback((email: string) => {
		return emailResetRequest({ bearer_token: authToken, tenantId, email }).then((e) =>
			console.log(JSON.stringify(e))
		);
	}, []);

	const resendVerifyCode = useCallback((email: string) => {
		return resentVerifyUserLinkRequest({ bearer_token: authToken, email, tenantId }).then((e) =>
			console.log(JSON.stringify(e))
		);
	}, []);

	const verifyChangeEmail = useCallback((code: string) => {
		return verifyChangemailRequest({ bearer_token: authToken, tenantId, code });
	}, []);

	useEffect(() => {
		setAllUsers(data?.items || []);
	}, [isLoading]);

	return {
		deleteUser,
		changeUserEmail,
		resendVerifyCode,
		verifyChangeEmail,
		allUsers
	};
}
