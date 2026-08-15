import { IOrganizationTeamList, IServerError, ITenant, IUser, PaginationResponse } from '@ever-teams/toolkit-types';
import QueryString from 'qs';
import { ApiCall } from '../fetch';

export const getOrganisationTeams = async ({
	organizationId,
	projectId,
	user,
	token
}: {
	user: IUser | null;
	token: string;
	organizationId: string;
	projectId: string | null;
}) => {
	try {
		if (!user) throw new Error('User is not authenticated');

		const { tenantId } = user;

		const conditions: {
			organizationId: string;
			tenantId: string;
			members?: { employeeId: string };
			projects?: { id: string };
		} = {
			organizationId,
			tenantId
		};

		if (user.employee) {
			const { id: employeeId } = user.employee;
			conditions.members = { employeeId };
		}

		if (projectId) {
			conditions.projects = { id: projectId };
		}

		const query = QueryString.stringify({
			where: conditions,
			withLastWorkedTask: 'true',
			relations: [
				'members',
				'members.role',
				'members.employee',
				'members.employee.user',
				'createdByUser',
				'projects',
				'projects.customFields.repository'
			]
		});

		const response = await ApiCall<PaginationResponse<IOrganizationTeamList>>({
			path: `/organization-team/me?${query}`,
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
		return { error: (error as Error).message } as IServerError;
	}
};

export const createDefaultOrganisationTeam = async ({ tenant, token }: { tenant: ITenant; token: string }) => {
	try {
		const response = await ApiCall<IOrganizationTeamList>({
			path: '/organization',
			method: 'POST',
			bearer_token: token,
			tenantId: tenant.id,
			body: {
				imageId: null,
				currency: 'USD',
				name: tenant.name,
				officialName: null,
				taxId: null,
				tags: null,
				bonusType: null,
				timeZone: null,
				startWeekOn: null,
				defaultValueDateType: 'TODAY',
				regionCode: null,
				numberFormat: null,
				dateFormat: null,
				fiscalStartDate: `${new Date().getFullYear()}-01-01`,
				fiscalEndDate: `${new Date().getFullYear()}-12-31`,
				invitesAllowed: true,
				inviteExpiryPeriod: 7,
				contact: { country: null, city: null, address: null, address2: null, latitude: null, longitude: null },
				registerAsEmployee: true,
				startedWorkOn: new Date().toISOString(),
				tenant,
				isDefault: true
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
		return { error: (error as Error).message } as IServerError;
	}
};
