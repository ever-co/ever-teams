import { IServerError, ITenant } from '@ever-teams/toolkit-types';
import { ApiCall } from '../fetch';

export const createTenant = async ({
	tenantName,
	token
}: {
	tenantName: string;
	token: string;
}): Promise<ITenant | IServerError> => {
	try {
		const response = await ApiCall<ITenant>({
			path: '/tenant',
			method: 'POST',
			bearer_token: token,
			body: {
				name: tenantName
			}
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
