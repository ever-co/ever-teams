'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { useSyncRef } from '@/core/hooks/common/use-sync-ref';
import { useUpdateTask } from '@/core/hooks/organizations/teams/use-update-task';
import { useTaskQueries } from '@/core/hooks/organizations/teams/use-task-queries';
import { useTaskLabelsQuery } from '@/core/hooks/tasks/use-task-labels-query';
import { toggleMenuSelection } from '@/core/components/tasks/task-property-menu';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { taskUpdateQueue } from '@/core/lib/utils/task.utils';
import type { TTag } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';

function tagNamesOf(task: TTask) {
	return (task.tags ?? []).map((tag) => tag.name ?? '').filter(Boolean);
}

/**
 * Toggles go through the task update queue so quick ones land in order, and the pending set shows until the last
 * save answers. Key the owner by task.
 */
export function useTaskLabelsEditor(task: TTask) {
	const t = useTranslations();
	const { taskLabels } = useTaskLabelsQuery();
	const { updateTask } = useUpdateTask();
	const { getTaskById } = useTaskQueries();
	const $task = useSyncRef(task);
	const savedNames = useMemo(() => tagNamesOf(task), [task]);
	const [pendingNames, setPendingNames] = useState<string[] | null>(null);
	const savesInFlight = useRef(0);

	const selectedNames = pendingNames ?? savedNames;

	const settle = useCallback(() => {
		savesInFlight.current -= 1;
		const isLastSave = savesInFlight.current === 0;
		if (isLastSave) {
			setPendingNames(null);
		}
	}, []);

	const save = useCallback(
		(names: string[]) => {
			const tags = (taskLabels as TTag[]).filter((label) => names.includes(label.name ?? ''));
			savesInFlight.current += 1;
			taskUpdateQueue.task(() => {
				const current = $task.current;
				return updateTask({ ...current, id: current.id, tags })
					.catch((error: unknown) => {
						const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
						toast.error(t('toasts.tasks.LABELS_UPDATE_FAILED'), { description: t(reasonKey) });
						getTaskById(current.id);
					})
					.finally(settle);
			});
		},
		[$task, getTaskById, settle, t, taskLabels, updateTask]
	);

	const toggle = useCallback(
		(name: string) => {
			const nextNames = toggleMenuSelection(selectedNames, name);
			setPendingNames(nextNames);
			save(nextNames);
		},
		[save, selectedNames]
	);

	return { selectedNames, toggle };
}
