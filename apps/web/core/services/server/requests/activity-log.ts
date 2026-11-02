import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { IActivityLog } from '@/core/types/interfaces/common/activity-log';
import { serverFetch } from '../fetch';

export function getActivityLogsRequest({
	query,
	bearer_token,
	tenantId
}: {
	query: string;
	bearer_token: string;
	tenantId: string;
}) {
	return serverFetch<PaginationResponse<IActivityLog>>({
		path: `/activity-log?${query}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}
