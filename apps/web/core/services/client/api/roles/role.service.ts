import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import {
	roleSchema,
	validateApiResponse,
	TRole,
	TRoleList,
	roleListSchema
} from '@/core/types/schemas';

/**
 * Enhanced Role Service with Zod validation
 *
 * This service extends the base APIService to add schema validation
 * for all API responses, ensuring data integrity and type safety.
 */
class RoleService extends APIService {
	/**
	 * Get all roles with validation
	 *
	 * @returns Promise<PaginationResponse<Role>> - Validated roles data
	 * @throws ValidationError if response data doesn't match schema
	 */
	getRoles = async (): Promise<TRoleList> => {
		return this.executeWithValidation(
			() => this.get<TRoleList>('/roles'),
			(data) => validateApiResponse(roleListSchema, data, 'getRoles API response'),
			{ method: 'getRoles', service: 'RoleService' }
		);
	};

	/**
	 * Create a new role with validation
	 *
	 * @param data - Role data without ID
	 * @returns Promise<Role> - Validated created role
	 * @throws ValidationError if response data doesn't match schema
	 */
	createRole = async (data: Omit<TRole, 'id'>): Promise<TRole> => {
		return this.executeWithValidation(
			() => this.post<TRole>('/roles', data),
			(responseData) => validateApiResponse(roleSchema, responseData, 'createRole API response'),
			{ method: 'createRole', service: 'RoleService' }
		);
	};

	/**
	 * Delete a role with validation
	 *
	 * @param id - Role ID to delete
	 * @returns Promise<Role> - Validated deleted role data
	 * @throws ValidationError if response data doesn't match schema
	 */
	deleteRole = async (id: string): Promise<TRole> => {
		return this.executeWithValidation(
			() => this.delete<TRole>(`/roles/${id}`),
			(data) => validateApiResponse(roleSchema, data, 'deleteRole API response'),
			{ method: 'deleteRole', service: 'RoleService', roleId: id }
		);
	};

	/**
	 * Update a role with validation
	 *
	 * @param data - Complete role data including ID
	 * @returns Promise<Role> - Validated updated role
	 * @throws ValidationError if response data doesn't match schema
	 */
	updateRole = async (data: TRole): Promise<TRole> => {
		return this.executeWithValidation(
			() => this.put<TRole>(`/roles/${data.id}`, data),
			(responseData) => validateApiResponse(roleSchema, responseData, 'updateRole API response'),
			{ method: 'updateRole', service: 'RoleService', roleId: data.id }
		);
	};
}

export const roleService = new RoleService(GAUZY_API_BASE_SERVER_URL.value);
