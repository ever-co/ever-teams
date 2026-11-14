import qs from 'qs';
import { APIService } from '@/core/services/client/api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import type {
	ITimeGoal,
	ITimeGoalCreateInput,
	ITimeGoalList,
	ITimeGoalProgress,
	ITimeGoalProgressQuery,
	ITimeGoalUpdateInput
} from '@/core/types/interfaces/timesheet/time-goal';

const GOALS = '/time-goals';

/** A goal's id stays one path segment, so it can never reach another route. */
const goalPath = (id: string) => `${GOALS}/${encodeURIComponent(id)}`;

/**
 * Client of the platform's time goals (`/time-goals`), through either transport (this app's proxies, or the
 * platform directly). Every read and write names the organization: the platform refuses one that does not. Who may
 * read or change which goal is the platform's to decide.
 */
class TimeGoalService extends APIService {
	private scope() {
		return { organizationId: this.organizationId, tenantId: this.tenantId };
	}

	/** The goals the caller may read in the organization: their own, their teams', those of the members they manage. */
	list = async ({ includeArchived = false }: { includeArchived?: boolean } = {}, signal?: AbortSignal) => {
		const search = qs.stringify({ ...this.scope(), includeArchived }, { skipNulls: true });
		const response = await this.get<ITimeGoalList>(`${GOALS}?${search}`, { signal });
		return response.data;
	};

	/** Where the caller, or each member of a team they may read, stands today against every goal that counts them. */
	progress = async (query: ITimeGoalProgressQuery = {}, signal?: AbortSignal) => {
		const search = qs.stringify({ ...this.scope(), ...query }, { skipNulls: true });
		const response = await this.get<ITimeGoalProgress[]>(`${GOALS}/progress?${search}`, { signal });
		return response.data;
	};

	create = async (input: ITimeGoalCreateInput) => {
		const response = await this.post<ITimeGoal>(GOALS, { ...input, ...this.scope() });
		return response.data;
	};

	update = async (id: string, input: ITimeGoalUpdateInput) => {
		const response = await this.put<ITimeGoal>(goalPath(id), { ...input, ...this.scope() });
		return response.data;
	};

	archive = async (id: string) => {
		const response = await this.put<ITimeGoal>(`${goalPath(id)}/archive`, this.scope());
		return response.data;
	};

	restore = async (id: string) => {
		const response = await this.put<ITimeGoal>(`${goalPath(id)}/restore`, this.scope());
		return response.data;
	};
}

export const timeGoalService = new TimeGoalService(GAUZY_API_BASE_SERVER_URL.value);
