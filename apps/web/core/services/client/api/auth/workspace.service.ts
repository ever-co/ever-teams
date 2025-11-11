import { getAccessTokenCookie } from '@/core/lib/helpers/cookies';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { TUser } from '@/core/types/schemas/user/user.schema';
import { TWorkspace, TWorkspaceResponse, workspaceResponseSchema } from '@/core/types/schemas';
import QueryString from 'qs';
import { validateApiResponse } from '@/core/types/schemas/utils/validation';
import { IAuthResponse } from '@/core/types/interfaces/auth/auth';

/**
 * Service for workspace management
 */
class WorkspaceService extends APIService {
	/**
	 * Retrieves all available workspaces for the authenticated user
	 */
	getUserWorkspaces = async (user: TUser | null): Promise<TWorkspace[]> => {
		try {
			const accessToken = getAccessTokenCookie();
			const userId = user?.id;
			const tenantId = user?.tenantId;

			if (!accessToken || !userId) {
				throw new Error('User not authenticated');
			}
			const query = QueryString.stringify({
				includeTeams: true
			});

			const response = await this.get<TWorkspaceResponse>(`/auth/workspaces?${query}`, { tenantId });

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
			this.logger.error(
				'Error retrieving workspaces:',
				{
					error
				},
				'WorkspaceService'
			);
			throw error;
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
			this.logger.error('Error validating workspace access:', { error });
			return false;
		}
	};

	/**
	 * Switch to a different workspace for an authenticated user
	 * Uses POST /auth/switch-workspace endpoint
	 *
	 * @param tenantId - The ID of the workspace (tenant) to switch to
	 * @returns {IAuthResponse} Authentication response with new tokens and user data
	 */
	switchWorkspace = async (tenantId: string): Promise<IAuthResponse> => {
		try {
			const response = await this.post<IAuthResponse>('/auth/switch-workspace', {
				tenantId
			});
			return response.data;
		} catch (error) {
			this.logger.error(
				'Error switching workspace:',
				{
					error,
					tenantId
				},
				'WorkspaceService'
			);
			throw error;
		}
	};
}

export const workspaceService = new WorkspaceService(GAUZY_API_BASE_SERVER_URL.value);
