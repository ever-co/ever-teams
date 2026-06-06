import { IEmployeeWithUser, IServerError } from '@ever-teams/toolkit-types';
import { ApiCall } from '../fetch';

export const createEmployee = async ({
	userId,
	organizationId,
	tenantId,
	token
}: {
	userId: string;
	organizationId: string;
	tenantId: string;
	token: string;
}) => {
	try {
		const response = await ApiCall<IEmployeeWithUser>({
			path: '/employee',
			method: 'POST',
			bearer_token: token,
			body: {
				startedWorkOn: new Date().toISOString(),
				userId,
				organizationId,
				tenantId
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
		return {
			statusCode: 500,
			message: 'Internal server error',
			error: String(error)
		} as IServerError;
	}
};
