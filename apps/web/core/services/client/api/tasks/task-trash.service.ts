import qs from 'qs';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { DeleteResponse, PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { IEntityRecordScope } from '@/core/types/interfaces/common/entity-record';
import { ITaskTrashQuery, ITrashedTask } from '@/core/types/interfaces/task/task-trash';

/** The platform serves at most this many trashed tasks a page (`TaskTrashQueryDTO`). */
export const TASK_TRASH_PAGE_SIZE = 50;

/**
 * Client for the task trash: the platform's list of soft-deleted tasks (`GET /tasks/trash`, behind
 * `GAUZY_TASK_TRASH_ENABLED`), moving a task there (`DELETE /tasks/:id/soft`), restoring it (`PUT /tasks/:id/recover`)
 * and deleting it for good (`DELETE /tasks/:id`). Each takes the grants a delete takes on the platform.
 */
class TaskTrashService extends APIService {
	/** A page of the trash, most recently deleted first. `skip` is a row offset. */
	list = async (
		query: ITaskTrashQuery,
		scope: IEntityRecordScope,
		signal?: AbortSignal
	): Promise<PaginationResponse<ITrashedTask>> => {
		const search = query.search?.trim();
		const params = qs.stringify(
			{
				tenantId: scope.tenantId,
				organizationId: scope.organizationId,
				...(query.organizationTeamId ? { organizationTeamId: query.organizationTeamId } : {}),
				...(query.projectId ? { projectId: query.projectId } : {}),
				...(search ? { search } : {}),
				skip: Math.max(query.skip ?? 0, 0),
				take: query.take ?? TASK_TRASH_PAGE_SIZE
			},
			{ skipNulls: true }
		);
		const response = await this.get<PaginationResponse<ITrashedTask>>(`/tasks/trash?${params}`, { signal });
		const data = response.data;

		return { items: Array.isArray(data?.items) ? data.items : [], total: Number(data?.total) || 0 };
	};

	/** Moves a task to the trash (the platform's soft delete). */
	moveToTrash = async (taskId: string, scope: IEntityRecordScope): Promise<void> => {
		await this.delete(`/tasks/${taskId}/soft?${qs.stringify(scope)}`);
	};

	/** Brings a task back from the trash. */
	restore = async (taskId: string, scope: IEntityRecordScope): Promise<void> => {
		await this.put(`/tasks/${taskId}/recover?${qs.stringify(scope)}`);
	};

	/** Deletes a task for good: it cannot be restored afterwards. */
	deleteForever = async (taskId: string): Promise<DeleteResponse> => {
		const response = await this.delete<DeleteResponse>(`/tasks/${taskId}`);

		return response.data;
	};
}

export const taskTrashService = new TaskTrashService(GAUZY_API_BASE_SERVER_URL.value);
