import { getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { APIService } from '../../api.service';
import qs from 'qs';
import { IRolePermissions, PaginationResponse } from '@/core/types/interfaces/to-review';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

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

		return this.get<PaginationResponse<IRolePermissions>>(`/role-permissions/${id}?${query}`);
	};

	updateRolePermission = async (data: IRolePermissions) => {
		return this.put<IRolePermissions>(`/role-permissions/${data.id}`, data);
	};
}

export const rolePermissionService = new RolePermissionService(GAUZY_API_BASE_SERVER_URL.value);
