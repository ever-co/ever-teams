import qs from 'qs';
import { ApiCall } from '../fetch';
import { IServerError, IUser, IUserUpdateInput } from '@ever-teams/toolkit-types';

export const getUser = async ({
	token,
	includeEmployee = true,
	includeOrganization = true
}: {
	token: string;
	includeEmployee?: boolean;
	includeOrganization?: boolean;
}) => {
	try {
		const query = qs.stringify({
			includeEmployee,
			includeOrganization
		});

		const response = await ApiCall<IUser>({
			path: '/user/me?' + query,
			method: 'GET',
			bearer_token: token
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

export const updateUser = async ({
	body,
	userId,
	token
}: {
	body: IUserUpdateInput;
	userId: string;
	token: string;
}) => {
	try {
		const response = await ApiCall<IUser>({
			path: '/user/' + userId,
			method: 'PUT',
			bearer_token: token,
			body
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
