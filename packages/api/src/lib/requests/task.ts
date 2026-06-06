import { IServerError, ITeamTask, IUser } from '@ever-teams/toolkit-types';
import qs from 'qs';
import { ApiCall } from '../fetch';

export const getMyTasks = async (
	user: IUser | null,
	token: string,
	projectId: string | null,
	organizationId: string
) => {
	try {
		if (!user || !user.employee) throw new Error('No employee or user found !');

		const { tenantId } = user;
		const employeeId = user.employee ? user.employee.id : undefined;

		const query = qs.stringify({
			where: {
				organizationId,
				tenantId,
				...(projectId ? { projectId } : {})
			}
		});

		const path = `/tasks/employee/${employeeId}?${query}`;

		const response = await ApiCall<ITeamTask[]>({
			path,
			method: 'GET',
			bearer_token: token,
			tenantId
		});

		if ('data' in response) return response.data;

		if ('error' in response || 'message' in response) return response;

		return { message: 'Unexpected API response format.' } as IServerError;
	} catch (error) {
		return { message: error instanceof Error ? error.message : 'Unknown error occurred' } as IServerError;
	}
};
