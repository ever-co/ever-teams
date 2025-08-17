import { getAccessTokenCookie } from '@/core/lib/helpers/cookies';
import { authService } from './auth.service';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { TUser } from '@/core/types/schemas/user/user.schema';
import {
	TWorkspace,
	TWorkspaceResponse,
	workspaceResponseSchema
} from '@/core/types/schemas/team/organization-team.schema';
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

			// Return workspaces directly - TWorkspace now matches API structure
			return validatedData.workspaces;
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
			await authService.signInWorkspace({
				email: params.email,
				token: params.token,
				selectedTeam: params.selectedTeam,
				defaultTeamId: params.defaultTeamId,
				lastTeamId: params.lastTeamId
			});

			this.logger.info('Successfully switched to workspace', {
				selectedTeam: params.selectedTeam
			});
		} catch (error) {
			this.logger.error('Error switching workspace:', error);
			throw error;
		}
	};

	/**
	 * Retrieves the current workspace based on cookies
	 * Since API doesn't provide isActive, we return the first workspace or use stored activeWorkspaceId
	 */
	getCurrentWorkspace = async (user: TUser | null): Promise<TWorkspace | null> => {
		try {
			const workspaces = await this.getUserWorkspaces(user);
			// For now, return the first workspace (can be enhanced with stored activeWorkspaceId later)
			return workspaces[0] || null;
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
			return workspaces.some((workspace) => workspace.user.tenant.id === workspaceId);
		} catch (error) {
			this.logger.error('Error validating workspace access:', error);
			return false;
		}
	};
}

export const workspaceService = new WorkspaceService(GAUZY_API_BASE_SERVER_URL.value);
