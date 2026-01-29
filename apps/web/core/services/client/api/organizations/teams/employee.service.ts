import qs from 'qs';
import { APIService } from '@/core/services/client/api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { ICreateEmployee } from '@/core/types/interfaces/organization/employee';
import {
	validatePaginationResponse,
	validateApiResponse,
	organizationTeamEmployeeSchema,
	TOrganizationTeamEmployee,
	TUpdateEmployee
} from '@/core/types/schemas';

class EmployeeService extends APIService {
	/**
	 * Get working employees using /employee/members endpoint
	 * Migrated from /employee/pagination to /employee/members for security reasons
	 * @param organizationTeamId - Optional team ID to filter members by specific team
	 * @returns Paginated list of employees
	 */
	getWorkingEmployees = async (organizationTeamId?: string): Promise<PaginationResponse<TOrganizationTeamEmployee>> => {
		const params: Record<string, any> = {
			organizationId: this.organizationId,
			tenantId: this.tenantId,
			'relations[0]': 'user'
		};

		// Filter by team if provided (correct parameter name: organizationTeamId, NOT teamId)
		if (organizationTeamId) {
			params.organizationTeamId = organizationTeamId;
		}

		const query = qs.stringify(params);

		// Use /employee/members instead of /employee/pagination
		const endpoint = `/employee/members?${query}`;

		return this.executeWithPaginationValidation(
			() => this.get<PaginationResponse<TOrganizationTeamEmployee>>(endpoint, { tenantId: this.tenantId }),
			(data) => validatePaginationResponse(organizationTeamEmployeeSchema, data, 'getWorkingEmployees API response'),
			{ method: 'getWorkingEmployees', service: 'EmployeeService', organizationTeamId }
		);
	};

	updateEmployee = async ({
		id,
		data
	}: {
		id: string;
		data: TUpdateEmployee;
	}): Promise<TOrganizationTeamEmployee> => {
		return this.executeWithValidation(
			() => this.put<TOrganizationTeamEmployee>(`/employee/${id}`, data),
			(responseData) => validateApiResponse(organizationTeamEmployeeSchema, responseData, 'updateEmployee API response'),
			{ method: 'updateEmployee', service: 'EmployeeService', employeeId: id }
		);
	};

	createEmployeeFromUser = async ({
		data,
		bearer_token
	}: {
		data: ICreateEmployee;
		bearer_token: string;
	}): Promise<TOrganizationTeamEmployee> => {
		return this.executeWithValidation(
			() => this.post<TOrganizationTeamEmployee>('/employee', data, {
				tenantId: data.tenantId,
				headers: { Authorization: `Bearer ${bearer_token}` }
			}),
			(responseData) => validateApiResponse(organizationTeamEmployeeSchema, responseData, 'createEmployeeFromUser API response'),
			{ method: 'createEmployeeFromUser', service: 'EmployeeService' }
		);
	};
}

export const employeeService = new EmployeeService(GAUZY_API_BASE_SERVER_URL.value);
