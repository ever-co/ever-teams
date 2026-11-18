import { IOrganizationTeamList, IServerError, ITenant, IUser, PaginationResponse } from '@ever-teams/toolkit-types';
import QueryString from 'qs';
import { ApiCall } from '../fetch';

interface ITeamsConditions {
	organizationId: string;
	tenantId: string;
	members?: { employeeId: string };
	projects?: { id: string };
}

const TEAM_RELATIONS = [
	'members',
	'members.role',
	'members.employee',
	'members.employee.user',
	'createdByUser',
	'projects',
	'projects.customFields.repository'
];

// What the teams read asks. An embed token may only name its organization and member (the API's embed guard refuses
// relations and any other key), so its read gets the member's teams without their members or projects.
function teamsQueryOf(conditions: ITeamsConditions, embedded: boolean): Record<string, unknown> {
	if (embedded) {
		const { organizationId, tenantId, members } = conditions;
		return { where: { organizationId, tenantId, members } };
	}
	return { where: conditions, withLastWorkedTask: 'true', relations: TEAM_RELATIONS };
}

export const getOrganisationTeams = async ({
	organizationId,
	projectId,
	user,
	token,
	embedded = false
}: {
	user: IUser | null;
	token: string;
	organizationId: string;
	projectId: string | null;
	// A read with a token from the host's getToken (config.getToken)
	embedded?: boolean;
}) => {
	try {
		if (!user) throw new Error('User is not authenticated');

		const { tenantId } = user;

		const conditions: ITeamsConditions = {
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

		const query = QueryString.stringify(teamsQueryOf(conditions, embedded));

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
