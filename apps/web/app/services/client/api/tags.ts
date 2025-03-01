import { ITag, PaginationResponse } from '@app/interfaces';
import { deleteApi, get, post, put } from '../axios';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/app/helpers';
import qs from 'qs';

export function getTagsAPI() {
	const organizationId = getOrganizationIdCookie();
	const tenantId = getTenantIdCookie();

	const obj = {
		'where[organizationId]': organizationId,
		'where[tenantId]': tenantId
	} as Record<string, string>;

	const query = qs.stringify(obj);

	return get<PaginationResponse<ITag>>(`/tags?${query}`);
}

export function createTagAPI(data: Omit<ITag, 'id'>) {
	return post<ITag>('/tags', data);
}

export function deleteTagAPI(id: string) {
	return deleteApi<ITag>(`/tags/${id}`);
}

export function updateTagAPI(data: ITag) {
	return put<ITag>(`/tags/${data.id}`, data);
}
