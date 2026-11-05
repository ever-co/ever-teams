import qs from 'qs';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { EBaseEntityEnum } from '@/core/types/generics/enums/entity';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { IActivityLog } from '@/core/types/interfaces/common/activity-log';
import { IEntityRecordScope } from '@/core/types/interfaces/common/entity-record';

const ACTIVITY_LOG_AUTHOR_RELATIONS = ['employee', 'employee.user', 'createdByUser'];

/** Client for Gauzy's activity log API (`GET /activity-log`, `GetActivityLogsDTO`). */
class ActivityLogService extends APIService {
	/**
	 * A record's newest logs first, one page of at most `take` (Gauzy caps it at 100). No `skip` is sent:
	 * `findActivityLogs` reads it as a 1-based page number, and its default is the first page.
	 */
	getLatest = async (
		entity: EBaseEntityEnum,
		entityId: string,
		take: number,
		scope: IEntityRecordScope,
		signal?: AbortSignal
	): Promise<PaginationResponse<IActivityLog>> => {
		const query = qs.stringify({
			entity,
			entityId,
			tenantId: scope.tenantId,
			organizationId: scope.organizationId,
			orderBy: 'createdAt',
			order: 'DESC',
			take,
			relations: ACTIVITY_LOG_AUTHOR_RELATIONS
		});
		const response = await this.get<PaginationResponse<IActivityLog>>(`/activity-log?${query}`, { signal });

		return response.data;
	};
}

export const activityLogService = new ActivityLogService(GAUZY_API_BASE_SERVER_URL.value);
