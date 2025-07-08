import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import {
	roleSchema,
	ZodValidationError,
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
		try {
			const response = await this.get<TRoleList>('/roles');

			// Validate the response data using Zod schema
			return validateApiResponse(roleListSchema, response.data, 'getRoles API response');
		} catch (error) {
			// Error logging is handled by the base APIService and HttpLoggerAdapter
			// This maintains proper separation of concerns
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Role validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'RoleService'
				);
			}
			throw error;
		}
	};

	/**
	 * Create a new role with validation
	 *
	 * @param data - Role data without ID
	 * @returns Promise<Role> - Validated created role
	 * @throws ValidationError if response data doesn't match schema
	 */
	createRole = async (data: Omit<TRole, 'id'>): Promise<TRole> => {
		try {
			const response = await this.post<TRole>('/roles', data);

			// Validate the response data
			return validateApiResponse(roleSchema, response.data, 'createRole API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Role creation validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'RoleService'
				);
			}
			throw error;
		}
	};

	/**
	 * Delete a role with validation
	 *
	 * @param id - Role ID to delete
	 * @returns Promise<Role> - Validated deleted role data
	 * @throws ValidationError if response data doesn't match schema
	 */
	deleteRole = async (id: string): Promise<TRole> => {
		try {
			const response = await this.delete<TRole>(`/roles/${id}`);

			// Validate the response data
			return validateApiResponse(roleSchema, response.data, 'deleteRole API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Role deletion validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'RoleService'
				);
			}
			throw error;
		}
	};

	/**
	 * Update a role with validation
	 *
	 * @param data - Complete role data including ID
	 * @returns Promise<Role> - Validated updated role
	 * @throws ValidationError if response data doesn't match schema
	 */
	updateRole = async (data: TRole): Promise<TRole> => {
		try {
			const response = await this.put<TRole>(`/roles/${data.id}`, data);

			// Validate the response data
			return validateApiResponse(roleSchema, response.data, 'updateRole API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Role update validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'RoleService'
				);
			}
			throw error;
		}
	};
}

export const roleService = new RoleService(GAUZY_API_BASE_SERVER_URL.value);
