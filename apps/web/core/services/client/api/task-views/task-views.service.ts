import qs from 'qs';
import { APIService } from '@/core/services/client/api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import {
	ETaskBuiltInView,
	type ITaskBuiltInViewPage,
	type ITaskBulkUpdateInput,
	type ITaskBulkUpdateOutcome,
	type ITaskView,
	type ITaskViewCreateInput,
	type ITaskViewList,
	type ITaskViewUpdateInput
} from '@/core/types/interfaces/common/task-views';

const VIEWS = '/task-views';
const path = (id: string) => encodeURIComponent(id);

/** The relations a built-in view's tasks come with (the platform's allowlist). */
const BUILT_IN_RELATIONS = ['members', 'members.user', 'tags', 'project', 'taskStatus', 'taskPriority', 'taskSize'];

/**
 * Client of the platform's saved views (`/task-views`), the built-in views (`/tasks/built-in/:key`) and the bulk
 * update (`/tasks/bulk-update`) for the Team tasks page. Both transports (this app's proxies, or the platform
 * directly). Every list and read carries the organization, so a stale session never reads another one.
 */
class TaskViewsService extends APIService {
	private scope() {
		return { organizationId: this.organizationId, tenantId: this.tenantId };
	}

	// ---------------------------------------------------------------- saved views

	/** The views of a team the caller may see (shared ones, and their own personal ones). */
	list = async (organizationTeamId: string, signal?: AbortSignal): Promise<ITaskViewList> => {
		const search = qs.stringify({ where: { ...this.scope(), organizationTeamId }, take: 200 }, { skipNulls: true });
		const response = await this.get<ITaskViewList>(`${VIEWS}?${search}`, { signal });
		return response.data;
	};

	getView = async (id: string, signal?: AbortSignal): Promise<ITaskView> => {
		const search = qs.stringify({ where: this.scope() }, { skipNulls: true });
		const response = await this.get<ITaskView>(`${VIEWS}/${path(id)}?${search}`, { signal });
		return response.data;
	};

	create = async (input: ITaskViewCreateInput): Promise<ITaskView> => {
		const response = await this.post<ITaskView>(VIEWS, { ...this.scope(), ...input });
		return response.data;
	};

	update = async (id: string, input: ITaskViewUpdateInput): Promise<ITaskView> => {
		const response = await this.put<ITaskView>(`${VIEWS}/${path(id)}`, { ...this.scope(), ...input });
		return response.data;
	};

	remove = async (id: string): Promise<void> => {
		await this.delete(`${VIEWS}/${path(id)}`);
	};

	/** The tasks in the order the view shows them when its ordering is manual. */
	setOrder = async (id: string, taskIds: string[], expectedVersion?: number): Promise<ITaskView> => {
		const response = await this.put<ITaskView>(`${VIEWS}/${path(id)}/order`, { ...this.scope(), taskIds, expectedVersion });
		return response.data;
	};

	// ---------------------------------------------------------------- built-in views

	/** A page of a built-in view, computed by the platform in the caller's time zone. */
	builtIn = async (key: ETaskBuiltInView, options: { take?: number; skip?: number; timeZone?: string } = {}, signal?: AbortSignal): Promise<ITaskBuiltInViewPage<TTask>> => {
		const timeZone = options.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
		const search = qs.stringify(
			{ ...this.scope(), timeZone, take: options.take ?? 200, skip: options.skip ?? 0, relations: BUILT_IN_RELATIONS },
			{ skipNulls: true, arrayFormat: 'brackets' }
		);
		const response = await this.get<ITaskBuiltInViewPage<TTask>>(`/tasks/built-in/${encodeURIComponent(key)}?${search}`, { signal });
		return response.data;
	};

	// ---------------------------------------------------------------- bulk update

	/** One request changing many tasks; the answer carries the previous values, so an undo is the same request. */
	bulkUpdate = async (input: ITaskBulkUpdateInput): Promise<ITaskBulkUpdateOutcome> => {
		const response = await this.post<ITaskBulkUpdateOutcome>('/tasks/bulk-update', { ...this.scope(), ...input });
		return response.data;
	};
}

export const taskViewsService = new TaskViewsService(GAUZY_API_BASE_SERVER_URL.value);
