import type {
	IEmployeePlaceholderBulkCreateResult,
	IEmployeePlaceholderEmployee,
	IEmployeePlaceholderMergePreview,
	IEmployeePlaceholderMergeResult
} from '@/core/types/interfaces/organization/employee-placeholder';
import { serverFetch } from '../fetch';

/** The session of the caller. Every request keeps the status of a refusal without a JSON body (an older API's 404). */
interface ISession {
	bearer_token: string;
	tenantId: string;
}

const ROUTE = '/employee-placeholder';

function placeholderPath(placeholderId: string, action: string): string {
	return `${ROUTE}/${encodeURIComponent(placeholderId)}/${action}`;
}

/** `POST /employee-placeholder`: one member without an account. */
export function createEmployeePlaceholderRequest({ body, ...session }: ISession & { body: unknown }) {
	return serverFetch<IEmployeePlaceholderEmployee>({
		path: ROUTE,
		method: 'POST',
		body,
		...session,
		keepsStatusOnError: true
	});
}

/** `POST /employee-placeholder/bulk`: many, for an import. */
export function createEmployeePlaceholdersRequest({ body, ...session }: ISession & { body: unknown }) {
	return serverFetch<IEmployeePlaceholderBulkCreateResult>({
		path: `${ROUTE}/bulk`,
		method: 'POST',
		body,
		...session,
		keepsStatusOnError: true
	});
}

/** `POST /employee-placeholder/:id/claim`: the invitation that hands the member's time to the person. */
export function claimEmployeePlaceholderRequest({
	placeholderId,
	body,
	...session
}: ISession & { placeholderId: string; body: unknown }) {
	return serverFetch<unknown>({
		path: placeholderPath(placeholderId, 'claim'),
		method: 'POST',
		body,
		...session,
		keepsStatusOnError: true
	});
}

/** `GET /employee-placeholder/:id/merge-preview`: what a merge would move. */
export function previewEmployeePlaceholderMergeRequest({
	placeholderId,
	query,
	...session
}: ISession & { placeholderId: string; query: string }) {
	return serverFetch<IEmployeePlaceholderMergePreview>({
		path: `${placeholderPath(placeholderId, 'merge-preview')}?${query}`,
		method: 'GET',
		...session,
		keepsStatusOnError: true
	});
}

/** `POST /employee-placeholder/:id/merge`: the merge itself. */
export function mergeEmployeePlaceholderRequest({
	placeholderId,
	body,
	...session
}: ISession & { placeholderId: string; body: unknown }) {
	return serverFetch<IEmployeePlaceholderMergeResult>({
		path: placeholderPath(placeholderId, 'merge'),
		method: 'POST',
		body,
		...session,
		keepsStatusOnError: true
	});
}
