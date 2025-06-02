import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import {
	validatePaginationResponse,
	roleSchema,
	ZodValidationError,
	validateApiResponse,
	TRole
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
	getRoles = async (): Promise<PaginationResponse<TRole>> => {
		try {
			const response = await this.get<PaginationResponse<TRole>>('/roles');

			// Validate the response data using Zod schema
			return validatePaginationResponse(roleSchema, response.data, 'getRoles API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				console.error('Role validation failed:', error.message);
				console.error('Validation issues:', error.issues);
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
				console.error('Role creation validation failed:', error.message);
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
				console.error('Role deletion validation failed:', error.message);
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
				console.error('Role update validation failed:', error.message);
			}
			throw error;
		}
	};
}

export const roleService = new RoleService(GAUZY_API_BASE_SERVER_URL.value);
