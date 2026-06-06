import { IUser, IOrganizationContact, IServerError } from '@ever-teams/toolkit-types';
import qs from 'qs';
import { ApiCall } from '../fetch';

export const getOrganizationClients = async (user: IUser | null, token: string, organizationId: string) => {
	try {
		if (!user || !user.employee) throw new Error('User is not authenticated');

		const { tenantId } = user;

		const query = qs.stringify({
			organizationId,
			tenantId
		});
		const employeeId = user.employee ? user.employee.id : undefined;

		const path = employeeId
			? `/organization-contact/employee/${employeeId}?${query}`
			: `/organization-contact?${query}`;

		const response = await ApiCall<IOrganizationContact[]>({
			path,
			method: 'GET',
			bearer_token: token,
			tenantId,
			organizationId
		});

		if ('data' in response) return response.data;

		if ('error' in response || 'message' in response) return response;

		return { message: 'Unexpected error format.' } as IServerError;
	} catch (error) {
		return { message: error instanceof Error ? error.message : String(error) } as IServerError;
	}
};
