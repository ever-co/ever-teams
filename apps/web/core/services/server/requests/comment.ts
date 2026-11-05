import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { IComment, ICommentCreateInput } from '@/core/types/interfaces/common/comment';
import { serverFetch } from '../fetch';

export function getCommentsRequest({
	query,
	bearer_token,
	tenantId
}: {
	query: string;
	bearer_token: string;
	tenantId: string;
}) {
	return serverFetch<PaginationResponse<IComment>>({
		path: `/comment?${query}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}

export function createCommentRequest({
	data,
	bearer_token,
	tenantId
}: {
	data: ICommentCreateInput;
	bearer_token: string;
	tenantId: string;
}) {
	return serverFetch<IComment>({
		path: '/comment',
		method: 'POST',
		body: data,
		bearer_token,
		tenantId
	});
}
