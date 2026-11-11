'use client';

import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { tasksByTeamState } from '@/core/stores';
import { useTaskStatusValue } from '@/core/hooks/tasks/use-task-status';
import type { DocsTaskChip } from '@/core/components/pages/docs/docs-editor-extensions';

/**
 * What the task links of a page show: the number, the title and the status of each task of the active team, from the
 * tasks the app already holds (no request per link). A link to another team's task reads as a plain task chip.
 */
export function useDocsTaskChips(): ReadonlyMap<string, DocsTaskChip> {
	const tasks = useAtomValue(tasksByTeamState);
	const statuses = useTaskStatusValue();
	return useMemo(() => {
		const chips = new Map<string, DocsTaskChip>();
		for (const task of tasks) {
			if (!task?.id) continue;
			const status = task.status ? statuses[task.status] : undefined;
			chips.set(task.id, {
				number: task.taskNumber ? `#${task.taskNumber}` : null,
				title: task.title ?? '',
				status: status?.name ?? task.status ?? null,
				statusColor: status?.bgColor ?? null
			});
		}
		return chips;
	}, [statuses, tasks]);
}
