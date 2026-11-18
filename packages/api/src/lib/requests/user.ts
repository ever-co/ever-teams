import qs from 'qs';
import { ApiCall } from '../fetch';
import { IApiRequestConfig } from '../config/api-config';
import { IServerError, IUser, IUserUpdateInput } from '@ever-teams/toolkit-types';

export const getUser = async (
	{
		token,
		includeEmployee = true,
		includeOrganization = true
	}: {
		token: string;
		includeEmployee?: boolean;
		includeOrganization?: boolean;
	},
	api?: IApiRequestConfig
) => {
	try {
		const query = qs.stringify({
			includeEmployee,
			includeOrganization
		});

		const response = await ApiCall<IUser>(
			{
				path: '/user/me?' + query,
				method: 'GET',
				bearer_token: token
			},
			api
		);

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

export const updateUser = async (
	{
		body,
		userId,
		token
	}: {
		body: IUserUpdateInput;
		userId: string;
		token: string;
	},
	api?: IApiRequestConfig
) => {
	try {
		const response = await ApiCall<IUser>(
			{
				path: '/user/' + userId,
				method: 'PUT',
				bearer_token: token,
				body
			},
			api
		);

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
