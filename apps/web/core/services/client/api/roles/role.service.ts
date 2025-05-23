import { IRole, PaginationResponse } from '@/core/types/interfaces';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

class RoleService extends APIService {
	getRoles = async () => {
		return this.get<PaginationResponse<IRole>>('/roles');
	};

	createRole = async (data: IRole) => {
		return this.post<IRole>('/roles', data);
	};

	deleteRole = async (id: string) => {
		return this.delete<IRole>(`/roles/${id}`);
	};

	updateRole = async (data: IRole) => {
		return this.put<IRole>(`/roles/${data.id}`, data);
	};
}

export const roleService = new RoleService(GAUZY_API_BASE_SERVER_URL.value);
