import qs from 'qs';
import { APIService } from '@/core/services/client/api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { IOrganizationTeamEmployee } from '@/core/types/interfaces/team/IOrganizationTeamEmployee';
import { PaginationResponse } from '@/core/types/interfaces/to-review/IDataResponse';
import { ICreateEmployee, IUpdateEmployee } from '@/core/types/interfaces/organization/employee/IEmployee';

class EmployeeService extends APIService {
	getWorkingEmployees = async (tenantId: string, organizationId: string) => {
		const params = {
			'where[tenantId]': tenantId,
			'where[organizationId]': organizationId,
			'relations[0]': 'user'
		};
		const query = qs.stringify(params);

		const endpoint = GAUZY_API_BASE_SERVER_URL.value ? `/employee/pagination?${query}` : '/employee/working';

		return this.get<PaginationResponse<IOrganizationTeamEmployee>>(endpoint, { tenantId });
	};

	updateEmployee = async ({ id, data }: { id: string; data: IUpdateEmployee }) => {
		return this.put<IUpdateEmployee>(`/employee/${id}`, data);
	};

	createEmployeeFromUser = async (data: ICreateEmployee, bearer_token: string) => {
		const { data: _data } = await this.post<IOrganizationTeamEmployee>('/employee', data, {
			tenantId: data.tenantId,
			headers: { Authorization: `Bearer ${bearer_token}` }
		});
		return _data;
	};
}

export const employeeService = new EmployeeService(GAUZY_API_BASE_SERVER_URL.value);
