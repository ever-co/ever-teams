import { APIService } from '../../api.service';
import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import {
	validatePaginationResponse,
	tagSchema,
	validateApiResponse,
	tagCreateSchema,
	ZodValidationError,
	TTag
} from '@/core/types/schemas';

/**
 * Enhanced Tag Service with Zod validation
 *
 * This service extends the base APIService to add schema validation
 * for all API responses, ensuring data integrity and type safety.
 */
class TagService extends APIService {
	/**
	 * Get all tags with validation
	 *
	 * @returns Promise<PaginationResponse<Tag>> - Validated tags data
	 * @throws ValidationError if response data doesn't match schema
	 */
	getTags = async (): Promise<PaginationResponse<TTag>> => {
		try {
			const obj = {
				'where[organizationId]': this.organizationId,
				'where[tenantId]': this.tenantId
			} as Record<string, string>;

			const query = qs.stringify(obj);
			const response = await this.get<PaginationResponse<TTag>>(`/tags?${query}`);

			// Validate the response data using Zod schema
			return validatePaginationResponse(tagSchema, response.data, 'getTags API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Tag validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'TagService'
				);
			}
			throw error;
		}
	};

	/**
	 * Create a new tag with validation
	 *
	 * @param data - Tag data without ID
	 * @returns Promise<Tag> - Validated created tag
	 * @throws ValidationError if response data doesn't match schema
	 */
	createTag = async (data: Omit<TTag, 'id'>): Promise<TTag> => {
		try {
			// Validate input data before sending
			const validatedInput = validateApiResponse(
				tagCreateSchema.partial(), // Allow partial data for creation
				data,
				'createTag input data'
			);

			const response = await this.post<TTag>('/tags', validatedInput);

			// Validate the response data
			return validateApiResponse(tagSchema, response.data, 'createTag API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Tag creation validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'TagService'
				);
			}
			throw error;
		}
	};

	/**
	 * Delete a tag with validation
	 *
	 * @param id - Tag ID to delete
	 * @returns Promise<Tag> - Validated deleted tag data
	 * @throws ValidationError if response data doesn't match schema
	 */
	deleteTag = async (id: string): Promise<TTag> => {
		try {
			const response = await this.delete<TTag>(`/tags/${id}`);

			// Validate the response data
			return validateApiResponse(tagSchema, response.data, 'deleteTag API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Tag deletion validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'TagService'
				);
			}
			throw error;
		}
	};

	/**
	 * Update a tag with validation
	 *
	 * @param data - Complete tag data including ID
	 * @returns Promise<Tag> - Validated updated tag
	 * @throws ValidationError if response data doesn't match schema
	 */
	updateTag = async (data: TTag): Promise<TTag> => {
		try {
			// Validate input data before sending
			const validatedInput = validateApiResponse(tagSchema, data, 'updateTag input data');

			const response = await this.put<TTag>(`/tags/${data.id}`, validatedInput);

			// Validate the response data
			return validateApiResponse(tagSchema, response.data, 'updateTag API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Tag update validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'TagService'
				);
			}
			throw error;
		}
	};

	/**
	 * Get tags by organization with validation
	 *
	 * @returns Promise<PaginationResponse<Tag>> - Validated tags data
	 * @throws ValidationError if response data doesn't match schema
	 */
	getTagsByOrganization = async (): Promise<PaginationResponse<TTag>> => {
		try {
			const obj = {
				'where[organizationId]': this.organizationId,
				'where[tenantId]': this.tenantId
			} as Record<string, string>;

			const query = qs.stringify(obj);
			const response = await this.get<PaginationResponse<TTag>>(`/tags?${query}`);

			// Validate the response data
			return validatePaginationResponse(tagSchema, response.data, 'getTagsByOrganization API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Tags by organization validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'TagService'
				);
			}
			throw error;
		}
	};
}

export const tagService = new TagService(GAUZY_API_BASE_SERVER_URL.value);
