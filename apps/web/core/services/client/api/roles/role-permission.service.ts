import { APIService } from '../../api.service';
import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { validateApiResponse, validatePaginationResponse, ZodValidationError } from '@/core/types/schemas';
import { rolePermissionSchema, TRolePermission } from '@/core/types/schemas/role/role-permission-schema';
import { z } from 'zod';

/**
 * The path that lists a role's permission rows. Gauzy reads `GET /role-permissions/:id` as the id of one row,
 * so in direct mode the role goes in `where[roleId]` of the list route; in proxy mode the
 * `/api/role-permissions/[id]` route takes it from the path.
 */
function rolePermissionsPath(roleId: string, query: string): string {
	const isDirectApi = Boolean(GAUZY_API_BASE_SERVER_URL.value);
	if (isDirectApi) {
		return `/role-permissions/pagination?${query}`;
	}
	return `/role-permissions/${roleId}?${query}`;
}

/**
 * The number of rows the API says an update changed, from its update result (`{ generatedMaps, raw, affected }`),
 * which carries no row; null for any other answer.
 */
function affectedRowsOf(answer: unknown): number | null {
	const isObject = typeof answer === 'object' && answer !== null;
	if (!isObject) {
		return null;
	}
	const affected = (answer as { affected?: unknown }).affected;
	if (typeof affected !== 'number') {
		return null;
	}
	return affected;
}

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
				}),
				where: {
					roleId: id,
					tenantId: this.tenantId
				}
			};
			const query = qs.stringify(params);
			const path = rolePermissionsPath(id, query);

			const response = await this.get<PaginationResponse<TRolePermission>>(path);

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

			// The API answers a saved switch with its update result, not with the row: read as a row, that answer
			// failed the check below and the page said the change was not saved (#5729). The row sent is what was saved.
			const affectedRows = affectedRowsOf(response.data);
			if (affectedRows === 0) {
				// The row is gone (removed since the page loaded): nothing was saved
				throw new Error('The permission was not saved: the API changed no row');
			}
			if (affectedRows !== null) {
				return validatedInput;
			}

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

	/**
	 * Get my role permissions
	 *
	 * @returns Promise<PaginationResponse<TRolePermission>> - Validated role permissions for current user
	 * @throws ValidationError if response data doesn't match schema
	 */

	getMyRolePermissions = async () => {
		try {
			const response = await this.get<PaginationResponse<TRolePermission>>('/role-permissions/me');

			// Validate the response data using Zod schema
			return validateApiResponse(
				z.array(rolePermissionSchema),
				response.data,
				'getMyRolePermissions API response'
			);
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Get my role permissions validation failed:',
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
