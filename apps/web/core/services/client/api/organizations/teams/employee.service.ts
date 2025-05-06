import qs from 'qs';
import { APIService } from '../../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import {
	ICreateEmployee,
	IEmployee,
	IUpdateEmployee,
	IWorkingEmployee,
	PaginationResponse
} from '@/core/types/interfaces';

class EmployeeService extends APIService {
	getWorkingEmployees = async (tenantId: string, organizationId: string) => {
		const params = {
			'where[tenantId]': tenantId,
			'where[organizationId]': organizationId,
			'relations[0]': 'user'
		};
		const query = qs.stringify(params);

		const endpoint = GAUZY_API_BASE_SERVER_URL.value ? `/employee/pagination?${query}` : '/employee/working';

		return this.get<PaginationResponse<IWorkingEmployee>>(endpoint, { tenantId });
	};

	updateEmployee = async ({ id, data }: { id: string; data: IUpdateEmployee }) => {
		return this.put<IUpdateEmployee>(`/employee/${id}`, data);
	};

	createEmployeeFromUser = async (data: ICreateEmployee, bearer_token: string) => {
		const { data: _data } = await this.post<IEmployee>('/employee', data, {
			tenantId: data.tenantId,
			headers: { Authorization: `Bearer ${bearer_token}` }
		});
		return _data;
	};
}

export const employeeService = new EmployeeService(GAUZY_API_BASE_SERVER_URL.value);
