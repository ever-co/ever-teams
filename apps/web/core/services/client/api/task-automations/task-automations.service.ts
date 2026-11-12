import qs from 'qs';
import { APIService } from '@/core/services/client/api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import type {
	ITaskAutomationRule,
	ITaskAutomationRuleCreateInput,
	ITaskAutomationRuleUpdateInput,
	ITaskAutomationRun,
	ITaskAutomationTemplate,
	ITaskAutomationTestResult
} from '@/core/types/interfaces/common/task-automation';

const BASE = '/task-automations';
const path = (id: string) => `${BASE}/${encodeURIComponent(id)}`;

/**
 * Client of the platform's task automations (`/task-automations`) for Settings → Automations: the organization's
 * rules, the built-in templates, the dry run and each rule's run history. Both transports (this app's proxies, or the
 * platform directly). Every read names the organization, so a stale session never reads another one; the writes carry
 * it in their body (the API service adds it).
 */
class TaskAutomationsService extends APIService {
	private organizationQuery(organizationId: string, extra: Record<string, unknown> = {}): string {
		return qs.stringify({ organizationId, ...extra }, { skipNulls: true });
	}

	/** The built-in templates (also the availability probe: a platform without the plugin answers 404). */
	templates = async (organizationId: string, signal?: AbortSignal): Promise<ITaskAutomationTemplate[]> => {
		const response = await this.get<ITaskAutomationTemplate[]>(`${BASE}/templates?${this.organizationQuery(organizationId)}`, {
			signal
		});
		return response.data;
	};

	/** The organization's rules, in their order. */
	list = async (organizationId: string, signal?: AbortSignal): Promise<ITaskAutomationRule[]> => {
		const response = await this.get<ITaskAutomationRule[]>(`${BASE}?${this.organizationQuery(organizationId)}`, { signal });
		return response.data;
	};

	create = async (organizationId: string, input: ITaskAutomationRuleCreateInput): Promise<ITaskAutomationRule> => {
		const response = await this.post<ITaskAutomationRule>(BASE, { ...input, organizationId }, undefined, false);
		return response.data;
	};

	update = async (organizationId: string, id: string, input: ITaskAutomationRuleUpdateInput): Promise<ITaskAutomationRule> => {
		const response = await this.put<ITaskAutomationRule>(path(id), { ...input, organizationId });
		return response.data;
	};

	/** The organization's rules in their new order: the ids named first, the rest after in theirs. */
	reorder = async (organizationId: string, ids: string[]): Promise<ITaskAutomationRule[]> => {
		const response = await this.put<ITaskAutomationRule[]>(`${BASE}/order`, { ids, organizationId });
		return response.data;
	};

	remove = async (organizationId: string, id: string): Promise<void> => {
		await this.delete(`${path(id)}?${this.organizationQuery(organizationId)}`);
	};

	/** What the rule would do to a task; nothing is written. */
	test = async (organizationId: string, id: string, taskId: string): Promise<ITaskAutomationTestResult> => {
		const response = await this.post<ITaskAutomationTestResult>(`${path(id)}/test`, { taskId, organizationId }, undefined, false);
		return response.data;
	};

	/** The rule's last runs, newest first. */
	runs = async (organizationId: string, id: string, limit = 50, signal?: AbortSignal): Promise<ITaskAutomationRun[]> => {
		const response = await this.get<ITaskAutomationRun[]>(`${path(id)}/runs?${this.organizationQuery(organizationId, { limit })}`, {
			signal
		});
		return response.data;
	};
}

export const taskAutomationsService = new TaskAutomationsService(GAUZY_API_BASE_SERVER_URL.value);
