import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { APIService } from '@/core/services/client/api.service';
import {
	validateApiResponse,
	organizationTeamEmployeeSchema,
	organizationTeamSchema,
	ZodValidationError,
	TOrganizationTeam,
	TOrganizationTeamEmployee,
	TOrganizationTeamEmployeeUpdate,
	organizationTeamEmployeeUpdateSchema
} from '@/core/types/schemas';
import { updateActiveTaskSchema } from '@/core/types/schemas/task/task.schema';

class OrganizationTeamEmployeeService extends APIService {
	deleteOrganizationTeamEmployee = async ({
		organizationTeamEmployeeId,
		employeeId
	}: {
		organizationTeamEmployeeId: string;
		employeeId: string;
	}): Promise<TOrganizationTeam> => {
		try {
			const response = await this.delete<TOrganizationTeam>(
				`/organization-team-employee/${organizationTeamEmployeeId}?tenantId=${this.tenantId}&employeeId=${employeeId}&organizationId=${this.organizationId}&organizationTeamId=${this.activeTeamId}`
			);

			// Validate API response using utility function
			return validateApiResponse(
				organizationTeamSchema,
				response.data,
				'deleteOrganizationTeamEmployee API response'
			);
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Delete organization team employee validation failed:',
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

	updateOrganizationTeamEmployee = async ({
		organizationTeamEmployeeId,
		data
	}: {
		organizationTeamEmployeeId: string;
		data: Partial<TOrganizationTeamEmployeeUpdate>;
	}): Promise<TOrganizationTeamEmployeeUpdate> => {
		try {
			const response = await this.put<TOrganizationTeamEmployeeUpdate>(
				`/organization-team-employee/${organizationTeamEmployeeId}`,
				data
			);

			// Validate API response using utility function
			return validateApiResponse(
				organizationTeamEmployeeUpdateSchema,
				response.data,
				'updateOrganizationTeamEmployee API response'
			);
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Update organization team employee validation failed:',
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

	updateOrganizationTeamEmployeeActiveTask = async ({
		organizationTeamEmployeeId,
		data
	}: {
		organizationTeamEmployeeId: string;
		data: Partial<TOrganizationTeamEmployeeUpdate>;
	}) => {
		try {
			const response = await this.put<TOrganizationTeamEmployee>(
				`/organization-team-employee/${organizationTeamEmployeeId}/active-task`,
				data
			);

			// Validate API response using utility function
			return validateApiResponse(
				updateActiveTaskSchema,
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

	removeOrganizationTeamEmployee = async ({ employeeId }: { employeeId: string }): Promise<boolean> => {
		try {
			const endpoint = GAUZY_API_BASE_SERVER_URL.value
				? `/organization-team-employee/${employeeId}`
				: `/organization-team/employee/${employeeId}`;

			const response = await this.delete<boolean>(endpoint);

			// For boolean responses, we can validate directly
			if (typeof response.data !== 'boolean') {
				throw new Error('Expected boolean response from removeOrganizationTeamEmployee API');
			}

			return response.data;
		} catch (error) {
			this.logger.error(
				'Remove organization team employee failed:',
				{
					message: error instanceof Error ? error.message : 'Unknown error',
					context: 'removeOrganizationTeamEmployee'
				},
				'OrganizationTeamEmployeeService'
			);
			throw error;
		}
	};

	editOrganizationTeamEmployeeOrder = async ({
		organizationTeamEmployeeId,
		data
	}: {
		organizationTeamEmployeeId: string;
		data: { order: number };
	}): Promise<TOrganizationTeamEmployee> => {
		try {
			const endpoint = GAUZY_API_BASE_SERVER_URL.value
				? `/organization-team-employee/${organizationTeamEmployeeId}`
				: `/organization-team/employee/${organizationTeamEmployeeId}`;

			const response = await this.put<TOrganizationTeamEmployee>(
				endpoint,
				{
					...data,
					organizationId: this.organizationId,
					organizationTeamId: this.activeTeamId
				},
				{
					tenantId: this.tenantId
				}
			);

			// Validate API response using utility function
			return validateApiResponse(
				organizationTeamEmployeeSchema,
				response.data,
				'editOrganizationTeamEmployeeOrder API response'
			);
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Edit organization team employee order validation failed:',
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
