import type {
	IPublicSavedReport,
	ISavedReport,
	ISavedReportShareResponse
} from '@/core/types/interfaces/timesheet/saved-report';
import type { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { serverFetch } from '../fetch';

/**
 * Gauzy's saved reports routes (ever-co/ever-gauzy#11912), for the proxy mode twins. Every request keeps the status of
 * a refusal without a JSON body: an API without these routes answers a bare 404, which the page reads as "saved
 * reports are not available here".
 */
interface ISession {
	bearer_token: string;
	tenantId: string;
}

function reportPathOf(id: string) {
	return `/saved-reports/${encodeURIComponent(id)}`;
}

export function listSavedReportsRequest({
	organizationId,
	skip,
	take,
	...session
}: ISession & { organizationId: string; skip?: string; take?: string }) {
	const query = new URLSearchParams({ organizationId });
	if (skip !== undefined) {
		query.set('skip', skip);
	}
	if (take !== undefined) {
		query.set('take', take);
	}
	return serverFetch<PaginationResponse<ISavedReport>>({
		path: `/saved-reports?${query.toString()}`,
		method: 'GET',
		...session,
		keepsStatusOnError: true
	});
}

export function createSavedReportRequest({ body, ...session }: ISession & { body: unknown }) {
	return serverFetch<ISavedReport>({
		path: '/saved-reports',
		method: 'POST',
		body,
		...session,
		keepsStatusOnError: true
	});
}

export function updateSavedReportRequest({ id, body, ...session }: ISession & { id: string; body: unknown }) {
	return serverFetch<ISavedReport>({
		path: reportPathOf(id),
		method: 'PUT',
		body,
		...session,
		keepsStatusOnError: true
	});
}

export function deleteSavedReportRequest({ id, ...session }: ISession & { id: string }) {
	return serverFetch<void>({
		path: reportPathOf(id),
		method: 'DELETE',
		...session,
		keepsStatusOnError: true
	});
}

export function shareSavedReportRequest({ id, body, ...session }: ISession & { id: string; body: unknown }) {
	return serverFetch<ISavedReportShareResponse>({
		path: `${reportPathOf(id)}/share`,
		method: 'POST',
		body,
		...session,
		keepsStatusOnError: true
	});
}

export function unshareSavedReportRequest({ id, ...session }: ISession & { id: string }) {
	return serverFetch<void>({
		path: `${reportPathOf(id)}/share`,
		method: 'DELETE',
		...session,
		keepsStatusOnError: true
	});
}

/** The read of a shared report through its link: no session. */
export function readSharedReportRequest(token: string) {
	return serverFetch<IPublicSavedReport>({
		path: `/public/saved-reports/${encodeURIComponent(token)}`,
		method: 'GET',
		keepsStatusOnError: true
	});
}
