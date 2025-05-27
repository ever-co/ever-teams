import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { APIService } from '../../api.service';
import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { PaginationResponse } from '@/core/types/interfaces/to-review/IDataResponse';
import { ITag } from '@/core/types/interfaces/tag/ITag';

class TagService extends APIService {
	getTags = async () => {
		const organizationId = getOrganizationIdCookie();
		const tenantId = getTenantIdCookie();

		const obj = {
			'where[organizationId]': organizationId,
			'where[tenantId]': tenantId
		} as Record<string, string>;

		const query = qs.stringify(obj);

		return this.get<PaginationResponse<ITag>>(`/tags?${query}`);
	};

	createTag = async (data: Omit<ITag, 'id'>) => {
		return this.post<ITag>('/tags', data);
	};

	deleteTag = async (id: string) => {
		return this.delete<ITag>(`/tags/${id}`);
	};

	updateTag = async (data: ITag) => {
		return this.put<ITag>(`/tags/${data.id}`, data);
	};
}

export const tagService = new TagService(GAUZY_API_BASE_SERVER_URL.value);
