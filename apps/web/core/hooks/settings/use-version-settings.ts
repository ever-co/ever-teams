'use client';

import { useCallback, useMemo } from 'react';
import { useTaskVersionsQuery } from '@/core/hooks/tasks/use-task-versions-query';
import { useCreateTaskVersion } from '@/core/hooks/tasks/use-create-task-version';
import { useEditTaskVersion } from '@/core/hooks/tasks/use-edit-task-version';
import { useDeleteTaskVersion } from '@/core/hooks/tasks/use-delete-task-version';
import { getActiveTeamIdCookie, getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import {
	PropertyDraft,
	PropertyListItem,
	propertyItemsOf,
	TaskPropertySettingsModel
} from '@/core/lib/utils/settings-task-properties';

/** The colour the former form sent with every new version; versions show none. */
const VERSION_COLOR = '#FFFFFF';

export function useVersionSettings(): TaskPropertySettingsModel {
	const { taskVersions, loading, isError, refetch } = useTaskVersionsQuery();
	const { createTaskVersion } = useCreateTaskVersion();
	const { editTaskVersion } = useEditTaskVersion();
	const { deleteTaskVersion } = useDeleteTaskVersion();

	const items = useMemo(() => propertyItemsOf(taskVersions), [taskVersions]);

	const create = useCallback(
		(draft: PropertyDraft) =>
			createTaskVersion({
				name: draft.name.trim(),
				color: VERSION_COLOR,
				organizationId: getOrganizationIdCookie(),
				organizationTeamId: getActiveTeamIdCookie(),
				tenantId: getTenantIdCookie()
			}),
		[createTaskVersion]
	);

	const update = useCallback(
		async (item: PropertyListItem, draft: PropertyDraft) => {
			const name = draft.name.trim();
			const isRenamed = name !== item.label.trim();
			if (!isRenamed) {
				return;
			}
			await editTaskVersion(item.id, { name });
		},
		[editTaskVersion]
	);

	const remove = useCallback((item: PropertyListItem) => deleteTaskVersion(item.id), [deleteTaskVersion]);

	return { items, isLoading: loading, isError, retry: refetch, create, update, remove };
}
