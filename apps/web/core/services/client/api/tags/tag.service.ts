import { APIService } from '../../api.service';
import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import {
	validatePaginationResponse,
	tagSchema,
	validateApiResponse,
	tagCreateSchema,
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
		const obj = {
			'where[organizationId]': this.organizationId,
			'where[tenantId]': this.tenantId
		} as Record<string, string>;

		const query = qs.stringify(obj);

		return this.executeWithPaginationValidation(
			() => this.get<PaginationResponse<TTag>>(`/tags?${query}`),
			(data) => validatePaginationResponse(tagSchema, data, 'getTags API response'),
			{ method: 'getTags', service: 'TagService' }
		);
	};

	/**
	 * Create a new tag with validation
	 *
	 * @param data - Tag data without ID
	 * @returns Promise<Tag> - Validated created tag
	 * @throws ValidationError if response data doesn't match schema
	 */
	createTag = async (data: Omit<TTag, 'id'>): Promise<TTag> => {
		const validatedInput = validateApiResponse(
			tagCreateSchema.partial(),
			data,
			'createTag input data'
		);

		return this.executeWithValidation(
			() => this.post<TTag>('/tags', validatedInput),
			(responseData) => validateApiResponse(tagSchema, responseData, 'createTag API response'),
			{ method: 'createTag', service: 'TagService' }
		);
	};

	/**
	 * Delete a tag with validation
	 *
	 * @param id - Tag ID to delete
	 * @returns Promise<Tag> - Validated deleted tag data
	 * @throws ValidationError if response data doesn't match schema
	 */
	deleteTag = async (id: string): Promise<TTag> => {
		return this.executeWithValidation(
			() => this.delete<TTag>(`/tags/${id}`),
			(data) => validateApiResponse(tagSchema, data, 'deleteTag API response'),
			{ method: 'deleteTag', service: 'TagService', tagId: id }
		);
	};

	/**
	 * Update a tag with validation
	 *
	 * @param data - Complete tag data including ID
	 * @returns Promise<Tag> - Validated updated tag
	 * @throws ValidationError if response data doesn't match schema
	 */
	updateTag = async (data: TTag): Promise<TTag> => {
		const validatedInput = validateApiResponse(tagSchema, data, 'updateTag input data');

		return this.executeWithValidation(
			() => this.put<TTag>(`/tags/${data.id}`, validatedInput),
			(responseData) => validateApiResponse(tagSchema, responseData, 'updateTag API response'),
			{ method: 'updateTag', service: 'TagService', tagId: data.id }
		);
	};

	/**
	 * Get tags by organization with validation
	 *
	 * @returns Promise<PaginationResponse<Tag>> - Validated tags data
	 * @throws ValidationError if response data doesn't match schema
	 */
	getTagsByOrganization = async (): Promise<PaginationResponse<TTag>> => {
		const obj = {
			'where[organizationId]': this.organizationId,
			'where[tenantId]': this.tenantId
		} as Record<string, string>;

		const query = qs.stringify(obj);

		return this.executeWithPaginationValidation(
			() => this.get<PaginationResponse<TTag>>(`/tags?${query}`),
			(data) => validatePaginationResponse(tagSchema, data, 'getTagsByOrganization API response'),
			{ method: 'getTagsByOrganization', service: 'TagService' }
		);
	};
}

export const tagService = new TagService(GAUZY_API_BASE_SERVER_URL.value);
