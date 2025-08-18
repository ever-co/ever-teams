import { getAccessTokenCookie } from '@/core/lib/helpers/cookies';
import { APIService, getFallbackAPI } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL, LAST_WORKSPACE_AND_TEAM } from '@/core/constants/config/constants';
import { TUser } from '@/core/types/schemas/user/user.schema';
import { TWorkspace, TWorkspaceResponse, workspaceResponseSchema, ZodValidationError } from '@/core/types/schemas';
import QueryString from 'qs';
import { validateApiResponse } from '@/core/types/schemas/utils/validation';
import { signinService } from './signin.service';
import { z } from 'zod';

/**
 * Schema for workspace switch parameters validation
 */
const switchWorkspaceParamsSchema = z.object({
	targetWorkspaceId: z.string().min(1, 'Target workspace ID is required'),
	user: z
		.object({
			email: z.string().email('Valid email is required'),
			id: z.string().min(1, 'User ID is required')
		})
		.nullable()
});

/**
 * Service for workspace management
 */
class WorkspaceService extends APIService {
	/**
	 * Retrieves all available workspaces for the authenticated user
	 * Uses /auth/workspaces endpoint which returns data in workspace-data.json format
	 */
	getUserWorkspaces = async (user: Partial<TUser> | null): Promise<TWorkspace[]> => {
		try {
			const accessToken = getAccessTokenCookie();
			const userId = user?.id;
			const tenantId = user?.tenantId;

			if (!accessToken || !userId) {
				throw new Error('User not authenticated');
			}

			// Call /auth/workspaces endpoint (same format as workspace-data.json)
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
	 * Switch to a different workspace
	 * Uses appropriate endpoint based on GAUZY_API_BASE_SERVER_URL
	 */
	switchToWorkspace = async (params: {
		targetWorkspaceId: string;
		user: TUser | null;
		workspaces?: TWorkspace[]; // Optional: if provided, skip getUserWorkspaces call
	}): Promise<void> => {
		// CLIENT LOG FUNCTION
		const logToFile = (message: string) => {
			if (typeof window !== 'undefined') {
				const timestamp = new Date().toISOString();
				const logKey = `workspace-switch-log-${Date.now()}`;
				localStorage.setItem(logKey, `[${timestamp}] CLIENT: ${message}`);
				console.log(`📝 CLIENT LOG: ${message}`);
			}
		};

		try {
			logToFile(
				`SWITCH WORKSPACE STARTED: ${JSON.stringify({ targetWorkspaceId: params.targetWorkspaceId, hasUser: !!params.user })}`
			);

			// Validate input parameters
			const validationResult = switchWorkspaceParamsSchema.safeParse(params);
			if (!validationResult.success) {
				logToFile(`VALIDATION FAILED: ${validationResult.error.message}`);
				throw new Error(`Invalid parameters: ${validationResult.error.message}`);
			}

			// After validation, we know user is not null and has email
			const user = params.user!;
			logToFile(`USER VALIDATED: ${user.email}`);

			// 1. Get workspaces (use provided ones or fetch them)
			let workspaces: TWorkspace[];
			if (params.workspaces) {
				logToFile(`USING PROVIDED WORKSPACES: Found ${params.workspaces.length} workspaces`);
				workspaces = params.workspaces;
			} else {
				logToFile(`CALLING getUserWorkspaces...`);
				workspaces = await this.getUserWorkspaces(user);
				logToFile(`getUserWorkspaces SUCCESS: Found ${workspaces.length} workspaces`);
			}
			const targetWorkspace = workspaces.find((w) => w.user.tenant.id === params.targetWorkspaceId);

			if (!targetWorkspace) {
				throw new Error('Target workspace not found');
			}

			// 2. Select target team (same logic as passcode)
			const selectedTeam = targetWorkspace.user.lastTeamId || targetWorkspace.current_teams[0]?.team_id;

			if (!selectedTeam) {
				throw new Error('No teams available in target workspace');
			}

			// 3. Switch workspace using appropriate endpoint
			if (GAUZY_API_BASE_SERVER_URL.value) {
				// Use Gauzy API directly via signinService.signInWorkspace
				await signinService.signInWorkspace({
					email: user.email!,
					token: targetWorkspace.token,
					defaultTeamId: selectedTeam,
					lastTeamId: targetWorkspace.user.lastTeamId || undefined
				});
			} else {
				// Use Next.js API endpoint for authenticated users
				const api = await getFallbackAPI();

				const requestData = {
					email: user.email!,
					token: targetWorkspace.token,
					teamId: selectedTeam,
					defaultTeamId: selectedTeam,
					lastTeamId: targetWorkspace.user.lastTeamId || undefined
				};

				console.log(
					'🔍 CLIENT SWITCH WORKSPACE REQUEST:',
					JSON.stringify(
						{
							targetWorkspaceId: params.targetWorkspaceId,
							email: user.email,
							hasToken: !!targetWorkspace.token,
							tokenLength: targetWorkspace.token?.length || 0,
							selectedTeam,
							timestamp: new Date().toISOString()
						},
						null,
						2
					)
				);

				try {
					await api.post('/auth/switch.workspace', requestData);
					console.log('✅ CLIENT SWITCH WORKSPACE SUCCESS');
				} catch (error: any) {
					const errorInfo = {
						status: error.response?.status,
						statusText: error.response?.statusText,
						data: error.response?.data,
						message: error.message,
						timestamp: new Date().toISOString(),
						requestData: requestData
					};

					console.error('❌ CLIENT SWITCH WORKSPACE ERROR:', JSON.stringify(errorInfo, null, 2));
					this.logger.error(
						'Error switching workspace:',
						{
							error,
							errorInfo
						},
						'WorkspaceService'
					);
					// Save error to localStorage for debugging
					if (typeof window !== 'undefined') {
						localStorage.setItem(
							`switch-workspace-error-${Date.now()}`,
							JSON.stringify(errorInfo, null, 2)
						);
						console.log('📝 Error saved to localStorage with key: switch-workspace-error-*');
					}

					throw error; // Re-throw so the hook can handle the error
				}
			}

			// 4. Save to localStorage (EXACT same as passcode)
			if (typeof window !== 'undefined') {
				window.localStorage.setItem(LAST_WORKSPACE_AND_TEAM, selectedTeam);
			}

			this.logger.info('Successfully switched to workspace', {
				targetWorkspaceId: params.targetWorkspaceId,
				selectedTeam: selectedTeam
			});
		} catch (error) {
			const logToFile = (message: string) => {
				if (typeof window !== 'undefined') {
					const timestamp = new Date().toISOString();
					const logKey = `workspace-switch-error-${Date.now()}`;
					localStorage.setItem(logKey, `[${timestamp}] CLIENT ERROR: ${message}`);
					console.error(`📝 CLIENT ERROR: ${message}`);
				}
			};

			logToFile(
				`SWITCH WORKSPACE FAILED: ${JSON.stringify({
					error: (error as any).message,
					statusCode: (error as any).statusCode,
					isApiError: (error as any).isApiError,
					targetWorkspaceId: params.targetWorkspaceId
				})}`
			);

			this.logger.error('Error retrieving workspaces:', { error }, 'WorkspaceService');
			throw error;
		}
	};

	loginInToWorkspace = async (params: { user: TUser | null; targetWorkspaceId: string }) => {
		const accessToken = getAccessTokenCookie();
		const { user } = params;
		const userId = user?.id;
		const tenantId = user?.tenantId;

		if (!accessToken || !userId) {
			throw new Error('User not authenticated');
		}
		if (GAUZY_API_BASE_SERVER_URL.value) {
			const response = await this.post('/auth/switch-workspace', { tenantId });

			this.logger.info('Successfully switched to workspace', {
				targetWorkspaceId: params.targetWorkspaceId,
				response: response
			});
			return response;
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
			this.logger.error('Error retrieving current workspace:', { error }, 'WorkspaceService');
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
			this.logger.error('Error validating workspace access:', { error });
			return false;
		}
	};
}

export const workspaceService = new WorkspaceService(GAUZY_API_BASE_SERVER_URL.value);
