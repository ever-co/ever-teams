import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import {
	TaskMetadataBootstrapResponse,
	TaskMetadataScope,
	TaskMetadataSection,
	canonicalizeTaskMetadataInclude
} from '@/core/types/interfaces/task/task-metadata-bootstrap';
import {
	taskPrioritySchema,
	taskSizeSchema,
	taskStatusSchema,
	taskVersionSchema,
	validatePaginationResponse
} from '@/core/types/schemas';
import { ApiErrorService } from '../../api-error.service';
import { APIService } from '../../api.service';
import { issueTypeService } from './issue-type.service';
import { taskLabelService } from './task-label.service';
import { taskPriorityService } from './task-priority.service';
import { taskRelatedIssueTypeService } from './task-related-issue-type.service';
import { taskSizeService } from './task-size.service';
import { taskStatusService } from './task-status.service';
import { taskVersionService } from './task-version.service';

class TaskMetadataBootstrapService extends APIService {
	getTaskMetadataBootstrap = async (
		scope: TaskMetadataScope,
		include?: readonly TaskMetadataSection[],
		signal?: AbortSignal
	): Promise<TaskMetadataBootstrapResponse> => {
		const canonicalInclude = canonicalizeTaskMetadataInclude(include);
		const query = qs.stringify({
			organizationId: scope.organizationId,
			...(scope.organizationTeamId !== undefined ? { organizationTeamId: scope.organizationTeamId } : {}),
			...(scope.projectId !== undefined ? { projectId: scope.projectId } : {}),
			include: canonicalInclude.join(',')
		});

		try {
			const response = await this.get<TaskMetadataBootstrapResponse>(`/task-metadata/bootstrap?${query}`, {
				tenantId: scope.tenantId,
				signal
			});

			return this.selectAndValidate(response.data, canonicalInclude);
		} catch (error) {
			if (ApiErrorService.isApiError(error) && error.isEndpointUnavailable()) {
				return this.loadLegacySections(scope, canonicalInclude);
			}

			throw error;
		}
	};

	private selectAndValidate(
		response: TaskMetadataBootstrapResponse,
		include: readonly TaskMetadataSection[]
	): TaskMetadataBootstrapResponse {
		const selected: Record<string, unknown> = {};

		include.forEach((section) => {
			switch (section) {
				case 'taskStatuses':
					selected[section] = validatePaginationResponse(
						taskStatusSchema,
						response[section],
						'task metadata bootstrap statuses'
					);
					break;
				case 'taskPriorities':
					selected[section] = validatePaginationResponse(
						taskPrioritySchema,
						response[section],
						'task metadata bootstrap priorities'
					);
					break;
				case 'taskSizes':
					selected[section] = validatePaginationResponse(
						taskSizeSchema,
						response[section],
						'task metadata bootstrap sizes'
					);
					break;
				case 'taskVersions':
					selected[section] = validatePaginationResponse(
						taskVersionSchema,
						response[section],
						'task metadata bootstrap versions'
					);
					break;
				default:
					selected[section] = response[section];
			}
		});

		return selected as TaskMetadataBootstrapResponse;
	}

	private async loadLegacySections(
		scope: TaskMetadataScope,
		include: readonly TaskMetadataSection[]
	): Promise<TaskMetadataBootstrapResponse> {
		const loaders: Record<TaskMetadataSection, () => Promise<unknown>> = {
			taskStatuses: () => taskStatusService.getTaskStatuses(scope),
			taskPriorities: () => taskPriorityService.getTaskPrioritiesList(scope),
			taskSizes: () => taskSizeService.getTaskSizes(scope),
			taskLabels: async () => (await taskLabelService.getTaskLabelsList(scope)).data,
			taskVersions: () => taskVersionService.getTaskVersions(scope),
			issueTypes: async () => (await issueTypeService.getIssueTypeList(scope)).data,
			relatedIssueTypes: async () => (await taskRelatedIssueTypeService.getTaskRelatedIssueTypeList(scope)).data
		};
		const entries = await Promise.all(include.map(async (section) => [section, await loaders[section]()] as const));

		return Object.fromEntries(entries) as TaskMetadataBootstrapResponse;
	}
}

export const taskMetadataBootstrapService = new TaskMetadataBootstrapService(GAUZY_API_BASE_SERVER_URL.value);
