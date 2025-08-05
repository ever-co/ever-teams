import { APIService } from '../../api.service';
import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { validateApiResponse, validatePaginationResponse, ZodValidationError } from '@/core/types/schemas';
import { rolePermissionSchema, TRolePermission } from '@/core/types/schemas/role/role-permission-schema';

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
		try {
			const params = {
				data: JSON.stringify({
					findInput: {
						roleId: id,
						tenantId: this.tenantId
					}
				})
			};
			const query = qs.stringify(params);

			const response = await this.get<PaginationResponse<TRolePermission>>(`/role-permissions/${id}?${query}`);

			// Validate the response data using Zod schema
			return validatePaginationResponse(rolePermissionSchema, response.data, 'getRolePermission API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Role permission validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'RolePermissionService'
				);
			}
			throw error;
		}
	};

	/**
	 * Update role permission with validation
	 *
	 * @param data - Role permission data to update
	 * @returns Promise<TRolePermission> - Validated updated role permission
	 * @throws ValidationError if response data doesn't match schema
	 */
	updateRolePermission = async (data: TRolePermission) => {
		try {
			// Validate input data before sending
			const validatedInput = validateApiResponse(rolePermissionSchema, data, 'updateRolePermission input data');

			const response = await this.put<TRolePermission>(`/role-permissions/${data.id}`, validatedInput);

			// Validate the response data
			return validateApiResponse(rolePermissionSchema, response.data, 'updateRolePermission API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Role permission update validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'RolePermissionService'
				);
			}
			throw error;
		}
	};
}

export const rolePermissionService = new RolePermissionService(GAUZY_API_BASE_SERVER_URL.value);
