import qs from 'qs';
import { APIService } from '@/core/services/client/api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { ICreateEmployee } from '@/core/types/interfaces/organization/employee';
import {
	validatePaginationResponse,
	validateApiResponse,
	organizationTeamEmployeeSchema,
	ZodValidationError,
	TOrganizationTeamEmployee,
	TUpdateEmployee
} from '@/core/types/schemas';

class EmployeeService extends APIService {
	getWorkingEmployees = async (): Promise<PaginationResponse<TOrganizationTeamEmployee>> => {
		try {
			const params = {
				'where[tenantId]': this.tenantId,
				'where[organizationId]': this.organizationId,
				'relations[0]': 'user'
			};
			const query = qs.stringify(params);

			const endpoint = GAUZY_API_BASE_SERVER_URL.value ? `/employee/pagination?${query}` : '/employee/working';

			const response = await this.get<PaginationResponse<TOrganizationTeamEmployee>>(endpoint, {
				tenantId: this.tenantId
			});

			// Validate the response data using Zod schema
			return validatePaginationResponse(
				organizationTeamEmployeeSchema,
				response.data,
				'getWorkingEmployees API response'
			);
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Working employees validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'EmployeeService'
				);
			}
			throw error;
		}
	};

	updateEmployee = async ({
		id,
		data
	}: {
		id: string;
		data: TUpdateEmployee;
	}): Promise<TOrganizationTeamEmployee> => {
		try {
			const response = await this.put<TOrganizationTeamEmployee>(`/employee/${id}`, data);

			// Validate the response data using Zod schema
			return validateApiResponse(organizationTeamEmployeeSchema, response.data, 'updateEmployee API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Employee update validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'EmployeeService'
				);
			}
			throw error;
		}
	};

	createEmployeeFromUser = async ({
		data,
		bearer_token
	}: {
		data: ICreateEmployee;
		bearer_token: string;
	}): Promise<TOrganizationTeamEmployee> => {
		try {
			const response = await this.post<TOrganizationTeamEmployee>('/employee', data, {
				tenantId: data.tenantId,
				headers: { Authorization: `Bearer ${bearer_token}` }
			});

			// Validate the response data using Zod schema
			return validateApiResponse(
				organizationTeamEmployeeSchema,
				response.data,
				'createEmployeeFromUser API response'
			);
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Employee creation validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'EmployeeService'
				);
			}
			throw error;
		}
	};
}

export const employeeService = new EmployeeService(GAUZY_API_BASE_SERVER_URL.value);
