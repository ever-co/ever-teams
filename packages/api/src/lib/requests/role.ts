import { IRole, IServerError, IUser } from '@ever-teams/toolkit-types';
import { ApiCall } from '../fetch';
import { IApiRequestConfig } from '../config/api-config';
import QueryString from 'qs';

export const findRole = async (roleName: string, user: IUser | null, token: string, api?: IApiRequestConfig) => {
	try {
		if (!user) {
			throw new Error('User is not authenticated');
		}
		const { tenantId } = user;

		const query = QueryString.stringify({
			name: roleName
		});

		const role = await ApiCall<IRole>(
			{
				method: 'GET',
				path: `/roles/options?${query}`,
				bearer_token: token,
				tenantId
			},
			api
		);

		if ('data' in role) {
			return role.data;
		}

		if ('error' in role || 'message' in role) {
			return role;
		}

		return { error: 'Unexpected response format' } as IServerError;
	} catch (error) {
		return { error: (error as Error).message } as IServerError;
	}
};
