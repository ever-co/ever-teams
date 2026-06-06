import { IProject, IServerError, IUser } from '@ever-teams/toolkit-types';
import qs from 'qs';
import { ApiCall } from '../fetch';

export const getOrganisationProjects = async (
	user: IUser | null,
	token: string,
	selectedClient: string | null,
	organizationId: string
) => {
	try {
		if (!user || !user.employee) throw new Error('No user found !');

		const { tenantId } = user;
		const employeeId = user.employee.id ?? undefined;

		const query = qs.stringify(
			{
				organizationId,
				tenantId,
				organizationContactId: selectedClient
			},
			{ skipNulls: true }
		);

		const path = `/organization-projects/employee/${employeeId}?${query}`;

		const response = await ApiCall<IProject[]>({
			path,
			method: 'GET',
			bearer_token: token,
			tenantId
		});

		if ('data' in response) return response.data;

		if ('error' in response || 'message' in response) return response;

		return { message: 'Unexpected error format.' } as IServerError;
	} catch (error) {
		return { message: error instanceof Error ? error.message : String(error) } as IServerError;
	}
};
