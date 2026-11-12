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
import {
	inactiveEmployeePageSchema,
	type TInactiveEmployee,
	type TInactiveEmployeePage
} from '@/core/types/schemas/organization/inactive-employee.schema';
import { inactiveEmployeePagesAfterFirst, inactiveEmployeesQueryOf } from '@/core/lib/utils/member-access';
import { scopedReadConfig, ScopedReadOptions } from '@/core/services/client/api-request-scope';

interface InactiveEmployeesRead {
	organizationId: string;
	tenantId: string;
	signal?: AbortSignal;
}

class EmployeeService extends APIService {
	/**
	 * Get working employees using /employee/members endpoint
	 * Migrated from /employee/pagination to /employee/members for security reasons
	 * @param organizationTeamId - Optional team ID to filter members by specific team
	 * @returns Paginated list of employees
	 */
	getWorkingEmployees = async (
		organizationTeamId?: string,
		options?: ScopedReadOptions
	): Promise<PaginationResponse<TOrganizationTeamEmployee>> => {
		try {
			const tenantId = options ? options.scope.tenantId : this.tenantId;
			const organizationId = options ? options.scope.organizationId : this.organizationId;
			const teamId = options ? (options.scope.teamId ?? organizationTeamId) : organizationTeamId;
			const params: Record<string, any> = {
				organizationId,
				tenantId,
				'relations[0]': 'user'
			};

			// Filter by team if provided (correct parameter name: organizationTeamId, NOT teamId)
			if (teamId) {
				params.organizationTeamId = teamId;
			}

			const query = qs.stringify(params);

			// Use /employee/members instead of /employee/pagination
			const endpoint = `/employee/members?${query}`;

			const response = await this.get<PaginationResponse<TOrganizationTeamEmployee>>(
				endpoint,
				options ? scopedReadConfig(options) : { tenantId: this.tenantId }
			);

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

	/**
	 * A page of the employees of the organization whose work ended. Gauzy's `GET /employee/pagination` needs
	 * ORG_EMPLOYEES_VIEW; the proxy answers the same page for the caller's own organization.
	 */
	getInactiveEmployeesPage = async (page: number, read: InactiveEmployeesRead): Promise<TInactiveEmployeePage> => {
		const { organizationId, tenantId, signal } = read;
		let endpoint = `/employee/inactive?${qs.stringify({ page })}`;
		if (GAUZY_API_BASE_SERVER_URL.value) {
			endpoint = `/employee/pagination?${inactiveEmployeesQueryOf({ organizationId, tenantId, page })}`;
		}

		const response = await this.get<TInactiveEmployeePage>(endpoint, { tenantId, signal });

		return validateApiResponse(inactiveEmployeePageSchema, response.data, 'getInactiveEmployeesPage API response');
	};

	/** Every employee of the organization whose work ended: the first page gives the total, the others follow it. */
	getInactiveEmployees = async (read: InactiveEmployeesRead): Promise<TInactiveEmployee[]> => {
		const firstPage = await this.getInactiveEmployeesPage(1, read);
		const laterPageNumbers = inactiveEmployeePagesAfterFirst(firstPage.total);
		const laterPages = await Promise.all(laterPageNumbers.map((page) => this.getInactiveEmployeesPage(page, read)));
		const pages = [firstPage, ...laterPages];

		return pages.flatMap((page) => page.items);
	};

	/**
	 * Ends a member's work, or brings them back with `null`: Gauzy's "End Work" and "Back to Work", on
	 * `PUT /employee/:id` (ORG_EMPLOYEES_EDIT). Gauzy turns their access and tracking off or on itself, and keeps
	 * their team memberships, time, tasks and comments.
	 */
	setEmployeeWorkEnd = async ({
		employeeId,
		organizationId,
		tenantId,
		endWork
	}: {
		employeeId: string;
		organizationId: string;
		tenantId: string;
		endWork: string | null;
	}): Promise<void> => {
		await this.put(`/employee/${encodeURIComponent(employeeId)}`, { organizationId, tenantId, endWork });
	};

	/**
	 * Sends a presence heartbeat for the signed-in employee. Gauzy resolves the employee from the
	 * token, stamps the time with its own clock and sends the stored presence back.
	 */
	sendPresenceHeartbeat = async (isIdle: boolean): Promise<{ lastSeenAt?: string; isIdle?: boolean }> => {
		const response = await this.put<{ lastSeenAt?: string; isIdle?: boolean }>('/employee/me/presence', {
			isIdle
		});
		return response.data;
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
