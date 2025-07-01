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

/**
 * Service for workspace management
 */
class WorkspaceService extends APIService {
	/**
	 * Retrieves all available workspaces for the authenticated user
	 * Leverages existing authentication data and supplements with team information
	 */
	getUserWorkspaces = async (user: TUser | null): Promise<TWorkspace[]> => {
		try {
			const accessToken = getAccessTokenCookie();
			const userId = user?.id;

			if (!accessToken || !userId) {
				throw new Error('User not authenticated');
			}
			const tenantId = user.tenantId;

			// Get user data for tenant information

			if (!tenantId) {
				throw new Error('Incomplete user data - missing tenant');
			}

			// Use the same service that the authentication flow uses
			// This gets ALL organizations where the user is a member (owned + invited)
			const userOrganizations = await userOrganizationService.getUserOrganizations({
				tenantId,
				userId,
				token: accessToken
			});

			if (!userOrganizations.data?.items?.length) {
				return [];
			}

			// Convert each user organization to a workspace
			const workspaces: TWorkspace[] = [];
			const organizationId = userOrganizations.data?.items?.[0]?.organizationId;
			if (!organizationId) {
				return [];
			}
			// Get teams for this organization
			const organizationTeams = await this.getAllOrganizationTeamRequest(organizationId, tenantId);
			console.log('organizationTeams', organizationTeams);

			if (!organizationTeams.data?.length) {
				return [];
			}

			// Each item in organizationTeams.data is a distinct workspace
			// Convert each team/workspace to a workspace object
			organizationTeams.data.forEach((team: any, index: number) => {
				// For now, let's mark the first workspace as active
				// In a real scenario, this would be determined by user's current context
				const isActive = index === 0; // Temporary logic - mark first as active

				const workspace: TWorkspace = {
					id: team.id, // Use team ID as workspace ID since each team is a workspace
					name: team.name, // Use team name as workspace name
					logo: team.logo || '',
					plan: 'Free',
					token: accessToken,
					isActive,
					isDefault: isActive,
					teams: [
						{
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
						}
					], // Each workspace contains the team data matching teamSchema
					organization: {
						id: team.organizationId,
						name: team.name,
						imageUrl: team.logo,
						tenantId: tenantId,
						isDefault: user?.employee?.organizationId === team.organizationId,
						organizationId: team.organizationId || '',
						organizationName: team.name
					},
					organizationTeams: [team] // Store the original team data
				};

				workspaces.push(workspace);
			});

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
