import { IPermission, IServerError, IUser } from '@ever-teams/toolkit-types';
import { ApiCall } from '../fetch';

export const getMyPermissions = async (user: IUser, token: string) => {
	try {
		const { tenantId } = user;

		const response = await ApiCall<IPermission[]>({
			path: `/role-permissions/me`,
			method: 'GET',
			bearer_token: token,
			tenantId
		});

		if ('data' in response) {
			return response.data;
		}

		if ('error' in response || 'message' in response) {
			return response;
		}

		return { error: 'Unexpected response format' } as IServerError;
	} catch (error) {
		return { message: (error as Error).message } as IServerError;
	}
};
