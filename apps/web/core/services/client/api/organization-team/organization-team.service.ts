import {
	DeleteResponse,
	IOrganizationTeam,
	IOrganizationTeamCreate,
	IOrganizationTeamList,
	IOrganizationTeamUpdate,
	IUser,
	OT_Member,
	PaginationResponse,
	TimerSource
} from '@/core/types/interfaces';
import { APIService } from '../../api.service';
import qs from 'qs';
import { organizationProjectService } from '../organization-project';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { getAccessTokenCookie, getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import api from '../../axios';
import moment from 'moment';

class OrganizationTeamService extends APIService {
	/**
	 * Fetches a list of teams for a specified organization.
	 *
	 * @param {string} organizationId The unique identifier for the organization.
	 * @param {string} tenantId The tenant identifier.
	 * @returns A Promise resolving to a paginated response containing the list of organization teams.
	 */
	getOrganizationTeams = async (organizationId: string, tenantId: string) => {
		const relations = [
			'members',
			'members.role',
			'members.employee',
			'members.employee.user',
			'createdByUser',
			'projects',
			'projects.customFields.repository'
		];
		// Construct the query parameters including relations
		const queryParameters = {
			'where[organizationId]': organizationId,
			'where[tenantId]': tenantId,
			source: TimerSource.TEAMS,
			withLastWorkedTask: 'true', // Corrected the typo here
			relations
		};

		// Serialize parameters into a query string
		const query = qs.stringify(queryParameters, { arrayFormat: 'brackets' });

		const endpoint = `/organization-team?${query}`;

		return this.get<PaginationResponse<IOrganizationTeamList>>(endpoint, { tenantId });
	};

	createOrganizationTeamGauzy = async (data: IOrganizationTeamCreate, bearer_token: string) => {
		const project = await organizationProjectService.createOrganizationProject({
			name: data.name,
			tenantId: data.tenantId,
			organizationId: data.organizationId
		});

		data.projects = [project.data];

		return this.post<IOrganizationTeam>('/organization-team', data, {
			tenantId: data.tenantId,
			headers: { Authorization: `Bearer ${bearer_token}` }
		});
	};

	createOrganizationTeam = async (name: string, user: IUser) => {
		const $name = name.trim();

		if (GAUZY_API_BASE_SERVER_URL.value) {
			const tenantId = getTenantIdCookie();
			const organizationId = getOrganizationIdCookie();
			const access_token = getAccessTokenCookie() || '';

			await this.createOrganizationTeamGauzy(
				{
					name: $name,
					tenantId,
					organizationId,
					managerIds: user?.employee?.id ? [user.employee.id] : [],
					public: true
				},
				access_token
			);

			return this.getOrganizationTeams(organizationId, tenantId);
		}

		return api.post<PaginationResponse<IOrganizationTeamList>>('/organization-team', { name });
	};

	/**
	 * Fetches details of a specific team within an organization.
	 *
	 * @param {string} teamId The unique identifier of the team.
	 * @param {string} organizationId The unique identifier of the organization.
	 * @param {string} tenantId The tenant identifier.
	 * @returns A Promise resolving to the details of the specified organization team.
	 */
	getOrganizationTeam = async (teamId: string, organizationId: string, tenantId: string) => {
		const relations = [
			'members',
			'members.role',
			'members.employee',
			'members.employee.user',
			'createdByUser',
			'projects',
			'projects.customFields.repository'
		];

		// Define base parameters including organization and tenant IDs, and date range
		const queryParams = {
			organizationId,
			tenantId,
			withLastWorkedTask: 'true', // Corrected the typo here
			startDate: moment().startOf('day').toISOString(),
			endDate: moment().endOf('day').toISOString(),
			includeOrganizationTeamId: 'false',
			relations
		};

		// Serialize parameters into a query string using 'qs'
		const queryString = qs.stringify(queryParams, { arrayFormat: 'brackets' });

		// Construct the endpoint URL
		const endpoint = `/organization-team/${teamId}?${queryString}`;

		// Fetch and return the team details
		return this.get<IOrganizationTeamList>(endpoint);
	};

	editOrganizationTeam = async (data: IOrganizationTeamUpdate) => {
		const tenantId = getTenantIdCookie();
		const organizationId = getOrganizationIdCookie();

		let response = await this.put<IOrganizationTeamList>(`/organization-team/${data.id}`, data);

		if (GAUZY_API_BASE_SERVER_URL.value) {
			response = await this.getOrganizationTeam(data.id, organizationId, tenantId);
		}

		return response;
	};

	updateOrganizationTeam = async (teamId: string, data: Partial<IOrganizationTeamUpdate>) => {
		const tenantId = getTenantIdCookie();
		const organizationId = getOrganizationIdCookie();

		let response = await this.put<IOrganizationTeamList>(`/organization-team/${teamId}`, data);

		if (GAUZY_API_BASE_SERVER_URL.value) {
			response = await this.getOrganizationTeam(teamId, organizationId, tenantId);
		}

		return response;
	};

	deleteOrganizationTeam = async (id: string) => {
		const organizationId = getOrganizationIdCookie();

		return this.delete<IOrganizationTeam>(`/organization-team/${id}?organizationId=${organizationId}`);
	};

	removeEmployeeOrganizationTeam = async (employeeId: string) => {
		const endpoint = GAUZY_API_BASE_SERVER_URL.value
			? `/organization-team-employee/${employeeId}`
			: `/organization-team/employee/${employeeId}`;

		return this.delete<boolean>(endpoint);
	};

	editEmployeeOrderOrganizationTeam = async (
		employeeId: string,
		data: { order: number; organizationTeamId: string; organizationId: string },
		tenantId?: string
	) => {
		const endpoint = GAUZY_API_BASE_SERVER_URL.value
			? `/organization-team-employee/${employeeId}`
			: `/organization-team/employee/${employeeId}`;

		return this.put<OT_Member>(endpoint, data, { tenantId });
	};

	removeUserFromAllTeam = async (userId: string) => {
		return this.delete<DeleteResponse>(`/organization-team/teams/${userId}`);
	};
}

export const organizationTeamService = new OrganizationTeamService(GAUZY_API_BASE_SERVER_URL.value);
