import qs from 'qs';
import { IAuthResponse } from '@/core/types/interfaces/auth/auth';
import { getAccessTokenCookie } from '@/core/lib/helpers/cookies';
import { authService } from './auth.service';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { TUser } from '@/core/types/schemas/user/user.schema';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import {
	TOrganizationTeam,
	TWorkspace,
	TWorkspaceResponse,
	TWorkspaceData,
	workspaceResponseSchema
} from '@/core/types/schemas/team/organization-team.schema';
import { AxiosResponse } from 'axios';
import QueryString from 'qs';
import { validateApiResponse } from '@/core/types/schemas/utils/validation';

/**
 * Service for workspace management
 */
class WorkspaceService extends APIService {
	/**
	 * Retrieves all available workspaces for the authenticated user
	 * Uses /auth/workspaces endpoint which returns data in workspace-data.json format
	 */
	getUserWorkspaces = async (user: TUser | null): Promise<TWorkspace[]> => {
		try {
			const accessToken = getAccessTokenCookie();
			const userId = user?.id;

			if (!accessToken || !userId) {
				throw new Error('User not authenticated');
			}

			// Call /auth/workspaces endpoint (same format as workspace-data.json)
			const query = QueryString.stringify({
				includeTeams: true
			});

			const response = await this.get<TWorkspaceResponse>(`/auth/workspaces?${query}`);

			// Validate API response using the schema
			const validatedData = validateApiResponse(
				workspaceResponseSchema,
				response.data,
				'getUserWorkspaces'
			) as TWorkspaceResponse;

			if (!validatedData.workspaces?.length) {
				return [];
			}

			// Transform workspace data to TWorkspace format
			const workspaces: TWorkspace[] = validatedData.workspaces.map(
				(workspaceData: TWorkspaceData, index: number) => {
					const isActive = index === 0; // Mark first workspace as active by default

					return {
						id: workspaceData.user.tenant.id, // Use tenant.id as workspace ID
						name: workspaceData.user.tenant.name, // Use tenant.name as workspace name
						logo: workspaceData.user.tenant.logo || '', // Use tenant.logo as workspace logo
						plan: 'Free', // Default plan
						token: workspaceData.token,
						isActive,
						isDefault: isActive,
						user: workspaceData.user, // Full user data
						currentTeams: workspaceData.current_teams, // Teams in this workspace
						// Legacy compatibility fields (to be deprecated)
						teams: workspaceData.current_teams.map((team) => ({
							id: team.team_id,
							name: team.team_name,
							logo: team.team_logo
						})),
						organization: {
							id: workspaceData.user.tenant.id,
							name: workspaceData.user.tenant.name,
							imageUrl: workspaceData.user.tenant.logo,
							tenantId: workspaceData.user.tenant.id,
							isDefault: isActive,
							organizationId: workspaceData.user.tenant.id,
							organizationName: workspaceData.user.tenant.name
						},
						organizationTeams: workspaceData.current_teams.map((team) => ({
							id: team.team_id,
							name: team.team_name,
							organizationId: workspaceData.user.tenant.id
						}))
					};
				}
			);

			return workspaces;
		} catch (error) {
			this.logger.error('Error retrieving workspaces:', error);
			throw error;
		}
	};

	/**
	 * Switch to a different workspace
	 * Reuses the same logic as authentication flow
	 */
	switchToWorkspace = async (params: {
		email: string;
		token: string;
		selectedTeam: string;
		defaultTeamId?: string;
		lastTeamId?: string;
	}): Promise<void> => {
		try {
			// Use the same signInWorkspace logic from authService
			const response = await authService.signInWorkspace({
				email: params.email,
				token: params.token,
				selectedTeam: params.selectedTeam,
				defaultTeamId: params.defaultTeamId,
				lastTeamId: params.lastTeamId
			});

			this.logger.info('Successfully switched to workspace', {
				tenantId: response.user?.tenantId,
				selectedTeam: params.selectedTeam
			});
		} catch (error) {
			this.logger.error('Error switching workspace:', error);
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
			this.logger.error('Error switching workspace:', error);
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
			this.logger.error('Error retrieving current workspace:', error);
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
			this.logger.error('Error validating workspace access:', error);
			return false;
		}
	};

	/**
	 * Enhanced workspace access validation with role and permission checking
	 */
	validateWorkspaceAccessEnhanced = async (
		workspaceId: string,
		user: TUser | null,
		requiredRole?: string,
		requiredPermissions?: string[]
	): Promise<{
		hasAccess: boolean;
		role?: string;
		permissions?: string[];
		reason?: string;
		workspace?: TWorkspace;
	}> => {
		try {
			// Basic authentication check
			if (!user?.id) {
				return {
					hasAccess: false,
					reason: 'User not authenticated'
				};
			}

			// Get user workspaces
			const workspaces = await this.getUserWorkspaces(user);
			const workspace = workspaces.find((w) => w.id === workspaceId);

			if (!workspace) {
				return {
					hasAccess: false,
					reason: 'Workspace not found or user not a member'
				};
			}

			// Check if workspace is active
			if (!workspace.organization?.isActive) {
				return {
					hasAccess: false,
					reason: 'Organization is not active',
					workspace
				};
			}

			// Get user role from team membership (since TWorkspace doesn't have userRole directly)
			// Find user's role by checking team memberships
			let userRole = 'EMPLOYEE'; // Default role
			let userPermissions: string[] = [];

			// Check if user is a manager in any team
			const isManagerInAnyTeam = workspace.teams.some((team) =>
				team.managers?.some((manager) => manager.employee?.userId === user.id)
			);

			if (isManagerInAnyTeam) {
				userRole = 'MANAGER';
				userPermissions = ['MANAGE_TEAM', 'VIEW_REPORTS', 'ASSIGN_TASKS'];
			} else {
				// Check if user is a member in any team
				const isMemberInAnyTeam = workspace.teams.some((team) =>
					team.members?.some((member) => member.employee?.userId === user.id)
				);

				if (isMemberInAnyTeam) {
					userRole = 'EMPLOYEE';
					userPermissions = ['VIEW_TASKS', 'UPDATE_OWN_TASKS'];
				}
			}

			// Check required role if specified
			if (requiredRole && userRole !== requiredRole) {
				// Check if user has a higher role (basic hierarchy)
				const roleHierarchy = ['EMPLOYEE', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'];
				const userRoleIndex = roleHierarchy.indexOf(userRole);
				const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);

				if (userRoleIndex === -1 || requiredRoleIndex === -1 || userRoleIndex < requiredRoleIndex) {
					return {
						hasAccess: false,
						reason: `Insufficient role. Required: ${requiredRole}, Current: ${userRole}`,
						role: userRole,
						permissions: userPermissions,
						workspace
					};
				}
			}

			// Check required permissions if specified
			if (requiredPermissions && requiredPermissions.length > 0) {
				const missingPermissions = requiredPermissions.filter(
					(permission) => !userPermissions.includes(permission)
				);

				if (missingPermissions.length > 0) {
					return {
						hasAccess: false,
						reason: `Missing permissions: ${missingPermissions.join(', ')}`,
						role: userRole,
						permissions: userPermissions,
						workspace
					};
				}
			}

			// Check if user is active in at least one team
			const isActiveInAnyTeam = workspace.teams.some((team) =>
				team.members?.some((member) => member.employee?.userId === user.id && member.isActive)
			);

			if (!isActiveInAnyTeam) {
				return {
					hasAccess: false,
					reason: 'User is not active in any team within this workspace',
					role: userRole,
					permissions: userPermissions,
					workspace
				};
			}

			// All checks passed
			return {
				hasAccess: true,
				role: userRole,
				permissions: userPermissions,
				workspace
			};
		} catch (error) {
			this.logger.error('Error in enhanced workspace access validation:', error);
			return {
				hasAccess: false,
				reason: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
			};
		}
	};
}

export const workspaceService = new WorkspaceService(GAUZY_API_BASE_SERVER_URL.value);
