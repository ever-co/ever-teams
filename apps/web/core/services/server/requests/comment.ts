import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { IComment, ICommentCreateInput, ICommentUpdateInput } from '@/core/types/interfaces/common/comment';
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

export function updateCommentRequest({
	id,
	data,
	bearer_token,
	tenantId
}: {
	id: string;
	data: ICommentUpdateInput;
	bearer_token: string;
	tenantId: string;
}) {
	return serverFetch<IComment>({
		path: `/comment/${encodeURIComponent(id)}`,
		method: 'PUT',
		body: data,
		bearer_token,
		tenantId
	});
}

export function deleteCommentRequest({ id, bearer_token, tenantId }: { id: string; bearer_token: string; tenantId: string }) {
	return serverFetch<unknown>({
		path: `/comment/${encodeURIComponent(id)}`,
		method: 'DELETE',
		bearer_token,
		tenantId
	});
}
