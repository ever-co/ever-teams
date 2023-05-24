import { PaginationResponse, IWorkingEmployee } from '@app/interfaces';
import api from '../axios';

export function getWorkingEmployeesAPI() {
	return api.get<PaginationResponse<IWorkingEmployee>>('/employee/working');
}
