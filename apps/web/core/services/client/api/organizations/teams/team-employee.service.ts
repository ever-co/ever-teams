import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { APIService } from '@/core/services/client/api.service';
import {
	validateApiResponse,
	organizationTeamEmployeeSchema,
	organizationTeamSchema,
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
		return this.executeWithValidation(
			() => this.delete<TOrganizationTeam>(
				`/organization-team-employee/${organizationTeamEmployeeId}?tenantId=${this.tenantId}&employeeId=${employeeId}&organizationId=${this.organizationId}&organizationTeamId=${this.activeTeamId}`
			),
			(data) => validateApiResponse(organizationTeamSchema, data, 'deleteOrganizationTeamEmployee API response'),
			{ method: 'deleteOrganizationTeamEmployee', service: 'OrganizationTeamEmployeeService', organizationTeamEmployeeId, employeeId }
		);
	};

	updateOrganizationTeamEmployee = async ({
		organizationTeamEmployeeId,
		data
	}: {
		organizationTeamEmployeeId: string;
		data: Partial<TOrganizationTeamEmployeeUpdate>;
	}): Promise<TOrganizationTeamEmployeeUpdate> => {
		return this.executeWithValidation(
			() => this.put<TOrganizationTeamEmployeeUpdate>(`/organization-team-employee/${organizationTeamEmployeeId}`, data),
			(responseData) => validateApiResponse(organizationTeamEmployeeUpdateSchema, responseData, 'updateOrganizationTeamEmployee API response'),
			{ method: 'updateOrganizationTeamEmployee', service: 'OrganizationTeamEmployeeService', organizationTeamEmployeeId }
		);
	};

	updateOrganizationTeamEmployeeActiveTask = async ({
		organizationTeamEmployeeId,
		data
	}: {
		organizationTeamEmployeeId: string;
		data: Partial<TOrganizationTeamEmployeeUpdate>;
	}) => {
		return this.executeWithValidation(
			() => this.put<TOrganizationTeamEmployee>(`/organization-team-employee/${organizationTeamEmployeeId}/active-task`, data),
			(responseData) => validateApiResponse(updateActiveTaskSchema, responseData, 'updateOrganizationTeamEmployeeActiveTask API response'),
			{ method: 'updateOrganizationTeamEmployeeActiveTask', service: 'OrganizationTeamEmployeeService', organizationTeamEmployeeId }
		);
	};

	removeOrganizationTeamEmployee = async ({ employeeId }: { employeeId: string }): Promise<boolean> => {
		const endpoint = GAUZY_API_BASE_SERVER_URL.value
			? `/organization-team-employee/${employeeId}`
			: `/organization-team/employee/${employeeId}`;

		return this.executeWithValidation(
			() => this.delete<boolean>(endpoint),
			(data) => {
				if (typeof data !== 'boolean') {
					throw new Error('Expected boolean response from removeOrganizationTeamEmployee API');
				}
				return data;
			},
			{ method: 'removeOrganizationTeamEmployee', service: 'OrganizationTeamEmployeeService', employeeId }
		);
	};

	editOrganizationTeamEmployeeOrder = async ({
		organizationTeamEmployeeId,
		data
	}: {
		organizationTeamEmployeeId: string;
		data: { order: number };
	}): Promise<TOrganizationTeamEmployee> => {
		const endpoint = GAUZY_API_BASE_SERVER_URL.value
			? `/organization-team-employee/${organizationTeamEmployeeId}`
			: `/organization-team/employee/${organizationTeamEmployeeId}`;

		return this.executeWithValidation(
			() => this.put<TOrganizationTeamEmployee>(
				endpoint,
				{
					...data,
					organizationId: this.organizationId,
					organizationTeamId: this.activeTeamId
				},
				{
					tenantId: this.tenantId
				}
			),
			(responseData) => validateApiResponse(organizationTeamEmployeeSchema, responseData, 'editOrganizationTeamEmployeeOrder API response'),
			{ method: 'editOrganizationTeamEmployeeOrder', service: 'OrganizationTeamEmployeeService', organizationTeamEmployeeId }
		);
	};
}

export const organizationTeamEmployeeService = new OrganizationTeamEmployeeService(GAUZY_API_BASE_SERVER_URL.value);
