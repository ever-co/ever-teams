import qs from 'qs';
import {
	IAuthResponse,
	ISigninEmailConfirmWorkspaces,
	IUserSigninWorkspaceResponse
} from '@/core/types/interfaces/auth/auth';
import { getAccessTokenCookie } from '@/core/lib/helpers/cookies';
import { authService } from './auth.service';
import { userOrganizationService } from '../users/user-organization.service';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { TUser } from '@/core/types/schemas/user/user.schema';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import { TOrganizationTeam, TWorkspace } from '@/core/types/schemas/team/organization-team.schema';
import { AxiosResponse } from 'axios';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { IUserOrganization } from '@/core/types/interfaces/organization/user-organization';
import { TOrganization } from '@/core/types/schemas';
import QueryString from 'qs';

/**
 * Service for workspace management
 */
class WorkspaceService extends APIService {
	/**
	 * Retrieves all available workspaces for the authenticated user
	 * Uses the same approach as the authentication flow to get multiple workspaces
	 */
	getUserWorkspaces = async (user: TUser | null): Promise<TWorkspace[]> => {
		try {
			const accessToken = getAccessTokenCookie();
			const userId = user?.id;

			if (!accessToken || !userId) {
				throw new Error('User not authenticated');
			}

			const tenantId = user.tenantId;
			if (!tenantId) {
				throw new Error('Incomplete user data - missing tenant');
			}

			// Use the same approach as authentication flow
			// Get ALL organizations where the user is a member (owned + invited)

			// Create a new instance of URLSearchParams for query string construction
			const query = QueryString.stringify({
				relations: [
					'organization',
					'user',
					'organization.tags',
					'organization.contact',
					'organization.employees',
					'organization.featureOrganizations',
					'organization.featureOrganizations.feature'
				],
				where: {
					userId,
					tenantId
				},
				includeEmployee: true
			});
			const userOrganizations = await this.get<PaginationResponse<TOrganizationTeam>>(
				`/user-organization?${query}`
			);

			if (!userOrganizations.data?.items?.length) {
				return [];
			}

			const workspaces: TWorkspace[] = [];

			// Process each organization as a potential workspace
			for (const organization of userOrganizations.data.items) {
				const orgId = organization.organizationId;
				if (!orgId) continue;

				try {
					// Get teams for this organization
					const organizationTeams = await this.getAllOrganizationTeamRequest(orgId, tenantId);

					const teamsData = organizationTeams.data as any;
					if (!teamsData?.items?.length) {
						console.log(`No teams found for organization ${orgId}`);
						continue;
					}

					// Create workspace for this organization
					const isActive = workspaces.length === 0; // Mark first workspace as active
					const primaryTeam = teamsData.items[0];

					const workspace: TWorkspace = {
						id: orgId, // Use organization ID as workspace ID
						name: organization.organization?.name || primaryTeam.name || 'Workspace',
						logo: organization.imageUrl || primaryTeam.logo || '',
						plan: 'Free',
						token: accessToken,
						isActive,
						isDefault: isActive,
						teams: teamsData.items.map((team: any) => ({
							id: team.id,
							name: team.name,
							logo: team.logo,
							prefix: team.prefix,
							profile_link: team.profile_link,
							organizationId: team.organizationId,
							tenantId: team.tenantId,
							members: team.members || [],
							managers: team.managers || [],
							projects: team.projects || [],
							tasks: team.tasks || []
						})), // All teams in this workspace
						organization: {
							id: orgId,
							name: organization.organization?.name || primaryTeam.name,
							imageUrl: organization.organization?.imageUrl || primaryTeam.logo,
							tenantId: tenantId,
							isDefault: organization.organization?.isDefault || false,
							organizationId: orgId,
							organizationName: organization.organization?.name || primaryTeam.name
						},
						organizationTeams: teamsData.items // Store all original team data
					};

					workspaces.push(workspace);
					console.log(
						'Added workspace:',
						workspace.name,
						'with',
						workspace.teams.length,
						'teams. Total workspaces:',
						workspaces.length
					);
				} catch (error) {
					console.error(`Error fetching teams for organization ${orgId}:`, error);
					// Continue with other organizations
				}
			}

			console.log('Final workspaces array:', workspaces);
			return workspaces;
		} catch (error) {
			console.error('Error retrieving workspaces:', error);
			throw error;
		}
	};
	getAllOrganizationTeamRequest(
		organizationId: string,
		tenantId: string
	): Promise<AxiosResponse<TOrganizationTeam[]>> {
		const relations = [
			'members',
			'members.role',
			'members.employee',
			'members.employee.user',
			'createdByUser',
			'projects',
			'projects.customFields.repository'
		];

		// Consolidate all parameters into a single object
		const params = {
			'where[organizationId]': organizationId,
			'where[tenantId]': tenantId,
			source: ETimeLogSource.TEAMS,
			withLastWorkedTask: 'true',
			relations
		};

		const query = qs.stringify(params, { arrayFormat: 'brackets' });
		return this.get<TOrganizationTeam[]>(`/organization-team?${query}`);
	}

	/**
	 * Switch workspace
	 * Uses the existing workspace signin endpoint
	 */
	switchWorkspace = async (
		teamId: string,
		email: string
	): Promise<AxiosResponse<{ loginResponse: IAuthResponse }>> => {
		try {
			const token = getAccessTokenCookie();
			if (!token) {
				throw new Error('User not authenticated');
			}
			// Use existing authentication service to switch workspace
			const response = await authService.signInWorkspace({
				email,
				token,
				selectedTeam: teamId
			});
			return {
				...response,
				data: { loginResponse: response.data as IAuthResponse }
			};
		} catch (error: any) {
			console.error('Error switching workspace:', error);
			throw error;
		}
	};

	/**
	 * Retrieves the current workspace based on cookies
	 */
	getCurrentWorkspace = async (user: TUser | null): Promise<TWorkspace | null> => {
		try {
			const workspaces = await this.getUserWorkspaces(user);
			return workspaces.find((workspace) => workspace.isActive) || null;
		} catch (error) {
			console.error('Error retrieving current workspace:', error);
			return null;
		}
	};

	/**
	 * Validates if a workspace is accessible for the user
	 */
	validateWorkspaceAccess = async (workspaceId: string, user: TUser | null): Promise<boolean> => {
		try {
			const workspaces = await this.getUserWorkspaces(user);
			return workspaces.some((workspace) => workspace.id === workspaceId);
		} catch (error) {
			console.error('Error validating workspace access:', error);
			return false;
		}
	};
}

export const workspaceService = new WorkspaceService(GAUZY_API_BASE_SERVER_URL.value);
