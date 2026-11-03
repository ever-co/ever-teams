'use client';

import { type CSSProperties, useCallback, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { CommandGroup, CommandItem } from '@/core/components/common/command';
import { TaskPropertyIcon } from '@/core/components/tasks/task-property-icon';
import { dataColorHue } from '@/core/components/tasks/task-data-color';
import { useTaskStatusValue } from '@/core/hooks/tasks/use-task-status';
import { useTaskPrioritiesValue } from '@/core/hooks/tasks/use-task-priorities-value';
import { activeTeamState, tasksByTeamState } from '@/core/stores';
import type { TStatusItem } from '@/core/types/interfaces/task/task-card';
import type { TTask } from '@/core/types/schemas/task/task.schema';

const RECENT_TASKS_LIMIT = 5;

const NEUTRAL_CHIP = 'hsl(var(--muted-foreground))';

function updatedTimeOf(task: TTask) {
	if (!task.updatedAt) {
		return 0;
	}
	return new Date(task.updatedAt).getTime();
}

function byMostRecentlyUpdated(first: TTask, second: TTask) {
	return updatedTimeOf(second) - updatedTimeOf(first);
}

function chipStyleOf(item: TStatusItem) {
	const color = item.bgColor;
	if (!color) {
		return { '--chip': NEUTRAL_CHIP } as CSSProperties;
	}
	return { '--chip': dataColorHue(color) } as CSSProperties;
}

function numberLabelOf(task: TTask) {
	if (!task.taskNumber) {
		return '';
	}
	return `#${task.taskNumber}`;
}

function headingKeyOf(hasSearch: boolean) {
	if (hasSearch) {
		return 'commandPalette.results.tasks' as const;
	}
	return 'commandPalette.results.recent' as const;
}

function searchValueOf(task: TTask) {
	return [task.taskNumber, task.title, task.id].filter(Boolean).join(' ');
}

interface PaletteTaskResultsProps {
	search: string;
	onOpenTask: (taskId: string) => void;
	className?: string;
}

/**
 * The tasks of the active team inside the command palette: the five most recently updated ones while the field is
 * empty, every task once the user types (the palette filters them), each with its status and priority as 3D labels.
 */
export function PaletteTaskResults({ search, onOpenTask, className }: PaletteTaskResultsProps) {
	const t = useTranslations();
	const tasks = useAtomValue(tasksByTeamState);
	const activeTeam = useAtomValue(activeTeamState);
	const statuses = useTaskStatusValue();
	const priorities = useTaskPrioritiesValue();
	const hasSearch = search.trim().length > 0;

	const shownTasks = useMemo(() => {
		const sorted = [...tasks].sort(byMostRecentlyUpdated);
		if (hasSearch) {
			return sorted;
		}
		return sorted.slice(0, RECENT_TASKS_LIMIT);
	}, [tasks, hasSearch]);

	if (shownTasks.length === 0) {
		return null;
	}

	const heading = t(headingKeyOf(hasSearch));
	const teamName = activeTeam?.name;

	return (
		<CommandGroup heading={heading} className={className}>
			{shownTasks.map((task) => (
				<PaletteTaskRow
					key={task.id}
					task={task}
					teamName={teamName}
					status={statuses[task.status ?? '']}
					priority={priorities[task.priority ?? '']}
					onOpenTask={onOpenTask}
				/>
			))}
		</CommandGroup>
	);
}

interface PaletteTaskRowProps {
	task: TTask;
	teamName?: string;
	status?: TStatusItem;
	priority?: TStatusItem;
	onOpenTask: (taskId: string) => void;
}

function PaletteTaskRow({ task, teamName, status, priority, onOpenTask }: PaletteTaskRowProps) {
	const t = useTranslations();
	const openTask = useCallback(() => onOpenTask(task.id), [onOpenTask, task.id]);
	const labels = [numberLabelOf(task)];
	if (teamName) {
		labels.push(t('commandPalette.results.inTeam', { team: teamName }));
	}
	const subtitle = labels.filter(Boolean).join(' · ');

	return (
		<CommandItem value={searchValueOf(task)} onSelect={openTask} className="min-h-14 gap-3 rounded-lg px-2">
			<span className="flex size-8 shrink-0 items-center justify-center">
				<TaskPropertyIcon kind="issueType" name={task.issueType} className="size-6" />
			</span>
			<span className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="truncate text-sm text-foreground">{task.title}</span>
				{subtitle && <span className="truncate text-xs text-muted-foreground">{subtitle}</span>}
			</span>
			<span className="hidden shrink-0 items-center gap-1.5 sm:flex">
				{status && <PaletteChip item={status} />}
				{priority && <PaletteChip item={priority} />}
			</span>
		</CommandItem>
	);
}

function PaletteChip({ item }: { item: TStatusItem }) {
	return (
		<span
			style={chipStyleOf(item)}
			className="chip-3d inline-flex h-6 items-center gap-1 rounded-md px-2 text-xs font-medium capitalize [&_[data-slot=task-property-icon]]:size-3.5"
		>
			{item.icon}
			{item.name}
		</span>
	);
}
