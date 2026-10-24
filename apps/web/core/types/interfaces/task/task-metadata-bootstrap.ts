import { PaginationResponse } from '../common/data-response';
import { IIssueType } from './issue-type';
import { ITaskRelatedIssueType } from './related-issue-type';
import { TTag, TTaskPriority, TTaskSize, TTaskStatus, TTaskVersion } from '@/core/types/schemas';

export const TASK_METADATA_SECTIONS = [
	'taskStatuses',
	'taskPriorities',
	'taskSizes',
	'taskLabels',
	'taskVersions',
	'issueTypes',
	'relatedIssueTypes'
] as const;

export type TaskMetadataSection = (typeof TASK_METADATA_SECTIONS)[number];

export type TaskMetadataScope = {
	tenantId: string;
	organizationId: string;
	organizationTeamId?: string;
	projectId?: string;
};

export type TaskMetadataBootstrapResponse = Partial<{
	taskStatuses: PaginationResponse<TTaskStatus>;
	taskPriorities: PaginationResponse<TTaskPriority>;
	taskSizes: PaginationResponse<TTaskSize>;
	taskLabels: PaginationResponse<TTag>;
	taskVersions: PaginationResponse<TTaskVersion>;
	issueTypes: PaginationResponse<IIssueType>;
	relatedIssueTypes: PaginationResponse<ITaskRelatedIssueType>;
}>;

export function canonicalizeTaskMetadataInclude(include?: readonly TaskMetadataSection[]): TaskMetadataSection[] {
	const selected = include ?? TASK_METADATA_SECTIONS;

	return [...new Set(selected)].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}
