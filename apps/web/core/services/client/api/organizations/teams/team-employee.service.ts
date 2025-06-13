import { getActiveTeamIdCookie } from '@/core/lib/helpers/cookies';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { APIService } from '@/core/services/client/api.service';
import {
	validateApiResponse,
	organizationTeamEmployeeSchema,
	organizationTeamSchema,
	ZodValidationError,
	TOrganizationTeam,
	TOrganizationTeamEmployee,
	TOrganizationTeamEmployeeUpdate
} from '@/core/types/schemas';

class OrganizationTeamEmployeeService extends APIService {
	deleteOrganizationEmployeeTeam = async ({
		id,
		employeeId,
		organizationId,
		tenantId
	}: {
		id: string;
		employeeId: string;
		organizationId: string;
		tenantId: string;
	}): Promise<TOrganizationTeam> => {
		try {
			const teamId = getActiveTeamIdCookie();

			const response = await this.delete<TOrganizationTeam>(
				`/organization-team-employee/${id}?tenantId=${tenantId}&employeeId=${employeeId}&organizationId=${organizationId}&organizationTeamId=${teamId}`
			);

			// Validate API response using utility function
			return validateApiResponse(
				organizationTeamSchema,
				response.data,
				'deleteOrganizationEmployeeTeam API response'
			);
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Delete organization employee team validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'OrganizationTeamEmployeeService'
				);
			}
			throw error;
		}
	};

	updateOrganizationEmployeeTeam = async (
		id: string,
		data: Partial<TOrganizationTeamEmployeeUpdate>
	): Promise<TOrganizationTeamEmployee> => {
		try {
			const response = await this.put<TOrganizationTeamEmployee>(`/organization-team-employee/${id}`, data);

			// Validate API response using utility function
			return validateApiResponse(
				organizationTeamEmployeeSchema,
				response.data,
				'updateOrganizationEmployeeTeam API response'
			);
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Update organization employee team validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'OrganizationTeamEmployeeService'
				);
			}
			throw error;
		}
	};

	updateOrganizationTeamEmployeeActiveTask = async (
		id: string,
		data: Partial<TOrganizationTeamEmployeeUpdate>
	): Promise<TOrganizationTeamEmployee> => {
		try {
			const response = await this.put<TOrganizationTeamEmployee>(
				`/organization-team-employee/${id}/active-task`,
				data
			);

			// Validate API response using utility function
			return validateApiResponse(
				organizationTeamEmployeeSchema,
				response.data,
				'updateOrganizationTeamEmployeeActiveTask API response'
			);
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Update organization team employee active task validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'OrganizationTeamEmployeeService'
				);
			}
			throw error;
		}
	};

	removeEmployeeOrganizationTeam = async (employeeId: string): Promise<boolean> => {
		try {
			const endpoint = GAUZY_API_BASE_SERVER_URL.value
				? `/organization-team-employee/${employeeId}`
				: `/organization-team/employee/${employeeId}`;

			const response = await this.delete<boolean>(endpoint);

			// For boolean responses, we can validate directly
			if (typeof response.data !== 'boolean') {
				throw new Error('Expected boolean response from removeEmployeeOrganizationTeam API');
			}

			return response.data;
		} catch (error) {
			this.logger.error(
				'Remove employee organization team failed:',
				{
					message: error instanceof Error ? error.message : 'Unknown error',
					context: 'removeEmployeeOrganizationTeam'
				},
				'OrganizationTeamEmployeeService'
			);
			throw error;
		}
	};

	editEmployeeOrderOrganizationTeam = async (
		employeeId: string,
		data: { order: number; organizationTeamId: string; organizationId: string },
		tenantId?: string
	): Promise<TOrganizationTeamEmployee> => {
		try {
			const endpoint = GAUZY_API_BASE_SERVER_URL.value
				? `/organization-team-employee/${employeeId}`
				: `/organization-team/employee/${employeeId}`;

			const response = await this.put<TOrganizationTeamEmployee>(endpoint, data, { tenantId });

			// Validate API response using utility function
			return validateApiResponse(
				organizationTeamEmployeeSchema,
				response.data,
				'editEmployeeOrderOrganizationTeam API response'
			);
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Edit employee order organization team validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'OrganizationTeamEmployeeService'
				);
			}
			throw error;
		}
	};
}

export const organizationTeamEmployeeService = new OrganizationTeamEmployeeService(GAUZY_API_BASE_SERVER_URL.value);
