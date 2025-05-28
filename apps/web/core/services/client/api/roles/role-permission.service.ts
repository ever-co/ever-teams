import { getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { APIService } from '../../api.service';
import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { PaginationResponse } from '@/core/types/interfaces/global/data-response';
import { IRolePermission } from '@/core/types/interfaces/role/role-permission';

class RolePermissionService extends APIService {
	getRolePermission = async (id: string) => {
		const tenantId = getTenantIdCookie();

		const params = {
			data: JSON.stringify({
				findInput: {
					roleId: id,
					tenantId
				}
			})
		};
		const query = qs.stringify(params);

		return this.get<PaginationResponse<IRolePermission>>(`/role-permissions/${id}?${query}`);
	};

	updateRolePermission = async (data: IRolePermission) => {
		return this.put<IRolePermission>(`/role-permissions/${data.id}`, data);
	};
}

export const rolePermissionService = new RolePermissionService(GAUZY_API_BASE_SERVER_URL.value);
