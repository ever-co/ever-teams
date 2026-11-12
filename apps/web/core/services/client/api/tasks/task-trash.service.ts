import qs from 'qs';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { DeleteResponse, PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { IEntityRecordScope } from '@/core/types/interfaces/common/entity-record';
import { ITaskTrashQuery, ITrashedTask } from '@/core/types/interfaces/task/task-trash';
import { taskDiscussionScope } from '@/core/lib/utils/task-discussion';
import { trashHttpStatusOf } from '@/core/lib/utils/task-trash';

/** The platform serves at most this many trashed tasks a page (`TaskTrashQueryDTO`). */
export const TASK_TRASH_PAGE_SIZE = 50;

/** The longest search the platform takes (`TaskTrashQueryDTO.search`, `@MaxLength(200)`): a longer one is a 400. */
export const TASK_TRASH_SEARCH_MAX_LENGTH = 200;

/**
 * Client for the task trash: the platform's list of soft-deleted tasks (`GET /tasks/trash`, behind
 * `GAUZY_TASK_TRASH_ENABLED`), moving a task there (`DELETE /tasks/:id/soft`), restoring it (`PUT /tasks/:id/recover`)
 * and deleting it for good (`DELETE /tasks/:id`). Each takes the grants a delete takes on the platform.
 */
class TaskTrashService extends APIService {
	/** Whether the platform keeps a trash, per tenant and organization, once it answered clearly. */
	private readonly availability = new Map<string, Promise<boolean>>();

	/**
	 * Whether the platform keeps a trash for the signed-in organization (`GAUZY_TASK_TRASH_ENABLED`), so a delete may
	 * move a task there: its list answers (a 403 too, which only says the reader may not see it). A 404 says the trash
	 * is off, and a platform without the route answers 400: then a delete stays permanent, as the spec promises,
	 * instead of hiding a task nobody could restore. Asked once per organization; an unclear failure (a network
	 * error, a 5xx) is not remembered and reads as no trash.
	 */
	isAvailable = async (): Promise<boolean> => {
		const scope = taskDiscussionScope();
		if (!scope) return false;
		const key = `${scope.tenantId}:${scope.organizationId}`;
		const known = this.availability.get(key);
		if (known) return known;
		const answer = this.get(`/tasks/trash?${qs.stringify({ ...scope, take: 1 })}`).then(
			() => true,
			(error: unknown) => {
				const status = trashHttpStatusOf(error);
				if (status === 403) return true;
				if (status !== 404 && status !== 400) this.availability.delete(key);
				return false;
			}
		);
		this.availability.set(key, answer);
		return answer;
	};

	/** A page of the trash, most recently deleted first. `skip` is a row offset. */
	list = async (
		query: ITaskTrashQuery,
		scope: IEntityRecordScope,
		signal?: AbortSignal
	): Promise<PaginationResponse<ITrashedTask>> => {
		// A title, a number (`42`, `#42`) or a key as the lists show it (`API-42`): the platform matches all three.
		const search = query.search?.trim().slice(0, TASK_TRASH_SEARCH_MAX_LENGTH);
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
		await this.delete(`/tasks/${encodeURIComponent(taskId)}/soft?${qs.stringify(scope)}`);
	};

	/** Brings a task back from the trash. */
	restore = async (taskId: string, scope: IEntityRecordScope): Promise<void> => {
		await this.put(`/tasks/${encodeURIComponent(taskId)}/recover?${qs.stringify(scope)}`);
	};

	/** Deletes a task for good: it cannot be restored afterwards. */
	deleteForever = async (taskId: string): Promise<DeleteResponse> => {
		const response = await this.delete<DeleteResponse>(`/tasks/${encodeURIComponent(taskId)}`);

		return response.data;
	};
}

export const taskTrashService = new TaskTrashService(GAUZY_API_BASE_SERVER_URL.value);
