'use client';

import { useAtomValue } from 'jotai';
import { useFormatter } from 'next-intl';
import { TaskPropertyIcon } from '@/core/components/tasks/task-property-icon';
import { activeTeamState } from '@/core/stores';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { TaskNumberButton } from './task-detail-actions';

export function TaskDetailEyebrow({ task }: Readonly<{ task: TTask }>) {
	const format = useFormatter();
	const activeTeam = useAtomValue(activeTeamState);
	let createdDay: string | null = null;
	if (task.createdAt) {
		createdDay = format.dateTime(new Date(task.createdAt), { day: 'numeric', month: 'short', year: 'numeric' });
	}
	return (
		<div className="flex min-w-0 items-center gap-2 text-[13px] text-muted-foreground">
			<TaskPropertyIcon kind="issueType" name={task.issueType ?? undefined} className="size-5 rounded-[6px]" />
			{activeTeam?.name && <span className="truncate font-medium text-foreground">{activeTeam.name}</span>}
			<TaskNumberButton task={task} className="-mx-1" />
			{createdDay && <span className="shrink-0 tabular-nums">· {createdDay}</span>}
		</div>
	);
}
