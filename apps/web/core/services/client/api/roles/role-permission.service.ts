import { APIService } from '../../api.service';
import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { validateApiResponse, validatePaginationResponse } from '@/core/types/schemas';
import { rolePermissionSchema, TRolePermission } from '@/core/types/schemas/role/role-permission-schema';
import { z } from 'zod';

/**
 * Enhanced Role Permission Service with Zod validation
 *
 * This service extends the base APIService to add schema validation
 * for all API responses, ensuring data integrity and type safety.
 */
class RolePermissionService extends APIService {
	/**
	 * Get role permissions with validation
	 *
	 * @param id - Role ID to get permissions for
	 * @returns Promise<PaginationResponse<TRolePermission>> - Validated role permissions
	 * @throws ValidationError if response data doesn't match schema
	 */
	getRolePermission = async (id: string) => {
		const params = {
			data: JSON.stringify({
				findInput: {
					roleId: id,
					tenantId: this.tenantId
				}
			})
		};
		const query = qs.stringify(params);

		return this.executeWithPaginationValidation(
			() => this.get<PaginationResponse<TRolePermission>>(`/role-permissions/${id}?${query}`),
			(data) => validatePaginationResponse(rolePermissionSchema, data, 'getRolePermission API response'),
			{ method: 'getRolePermission', service: 'RolePermissionService', roleId: id }
		);
	};

	/**
	 * Update role permission with validation
	 *
	 * @param data - Role permission data to update
	 * @returns Promise<TRolePermission> - Validated updated role permission
	 * @throws ValidationError if response data doesn't match schema
	 */
	updateRolePermission = async (data: TRolePermission) => {
		const validatedInput = validateApiResponse(rolePermissionSchema, data, 'updateRolePermission input data');

		return this.executeWithValidation(
			() => this.put<TRolePermission>(`/role-permissions/${data.id}`, validatedInput),
			(responseData) => validateApiResponse(rolePermissionSchema, responseData, 'updateRolePermission API response'),
			{ method: 'updateRolePermission', service: 'RolePermissionService', permissionId: data.id }
		);
	};

	/**
	 * Get my role permissions
	 *
	 * @returns Promise<PaginationResponse<TRolePermission>> - Validated role permissions for current user
	 * @throws ValidationError if response data doesn't match schema
	 */

	getMyRolePermissions = async () => {
		return this.executeWithValidation(
			() => this.get<PaginationResponse<TRolePermission>>('/role-permissions/me'),
			(data) => validateApiResponse(z.array(rolePermissionSchema), data, 'getMyRolePermissions API response'),
			{ method: 'getMyRolePermissions', service: 'RolePermissionService' }
		);
	};
}

export const rolePermissionService = new RolePermissionService(GAUZY_API_BASE_SERVER_URL.value);
