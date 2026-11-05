'use client';

import { memo, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { RadioMark } from '@/core/components/common/radio-mark';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { Button } from '@/core/components/duplicated-components/_button';
import { Eye, MoreHorizontal, Spinner, Trash } from '@/core/components/icons';
import { TaskNameInfoDisplay } from '@/core/components/tasks/task-displays';
import { TaskEstimate } from '@/core/components/tasks/task-estimate';
import { TaskPropertyIcon } from '@/core/components/tasks/task-property-icon';
import { useTaskStatusesQuery } from '@/core/hooks/tasks/use-task-statuses-query';
import { findStatusByName } from '@/core/lib/utils/project-list';
import type { TTaskStatus } from '@/core/types/schemas/task/task-status.schema';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import type { PendingPlanAddition } from '@/core/stores/daily-plan/pending-plan-additions';
import { PendingPlanTaskRow } from '../pending-plan-tasks';

export interface PlanTaskRowActions {
	onChooseDefault: (task: TTask) => void;
	onView: (task: TTask) => void;
	onRemove: (task: TTask) => void;
	onRemoveEverywhere: (task: TTask) => void;
	otherPlanIdsOf: (taskId: string) => string[];
}

interface PlanTaskRowProps extends PlanTaskRowActions {
	task: TTask;
	isToday: boolean;
	isPast: boolean;
	canEdit: boolean;
	isDefault: boolean;
	isPending: boolean;
	statuses: TTaskStatus[];
}

function statusLabelOf(status: string | null | undefined) {
	if (!status) {
		return '';
	}
	return status.replace(/[-_]+/g, ' ');
}

function PastStatus({ status, statuses }: Readonly<{ status: string | null | undefined; statuses: TTaskStatus[] }>) {
	const color = findStatusByName(statuses, status)?.color;
	const label = statusLabelOf(status);
	if (!label) {
		return null;
	}
	return (
		<span className="inline-flex h-6 max-w-28 shrink-0 items-center gap-1.5 rounded-md bg-foreground/[0.05] px-1.5 text-xs font-medium capitalize text-foreground">
			<TaskPropertyIcon kind="status" name={status ?? ''} color={color} className="size-3.5" />
			<span className="truncate">{label}</span>
		</span>
	);
}

function PlanTaskMenu({
	task,
	isPast,
	canEdit,
	onView,
	onRemove,
	onRemoveEverywhere,
	otherPlanIdsOf
}: Readonly<Omit<PlanTaskRowProps, 'isToday' | 'isDefault' | 'isPending' | 'statuses' | 'onChooseDefault'>>) {
	const t = useTranslations();
	const canRemove = canEdit && !isPast;
	const isInOtherPlans = otherPlanIdsOf(task.id).length > 0;
	const canRemoveEverywhere = canRemove && isInOtherPlans;
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon-sm"
					aria-label={t('dailyPlan.editor.TASK_ACTIONS')}
					className="text-muted-foreground"
				>
					<MoreHorizontal className="size-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuItem onClick={() => onView(task)}>
					<Eye />
					{t('common.VIEW')}
				</DropdownMenuItem>
				{canRemove && <DropdownMenuSeparator />}
				{canRemove && (
					<DropdownMenuItem variant="destructive" onClick={() => onRemove(task)}>
						<Trash />
						{t('dailyPlan.REMOVE_FROM_THIS_PLAN')}
					</DropdownMenuItem>
				)}
				{canRemoveEverywhere && (
					<DropdownMenuItem variant="destructive" onClick={() => onRemoveEverywhere(task)}>
						<Trash />
						{t('dailyPlan.REMOVE_FROM_ALL_PLANS')}
					</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

const PlanTaskRow = memo(function PlanTaskRow(props: Readonly<PlanTaskRowProps>) {
	const { task, isToday, isPast, isDefault, isPending, statuses, onChooseDefault } = props;
	const t = useTranslations();
	return (
		<li className="flex h-11 items-center gap-2">
			{isToday && (
				<button
					type="button"
					onClick={() => onChooseDefault(task)}
					aria-pressed={isDefault}
					aria-label={t('dailyPlan.editor.START_WITH')}
					title={t('dailyPlan.editor.START_WITH')}
					className="flex size-6 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
				>
					<RadioMark isChecked={isDefault} />
				</button>
			)}
			<div className="min-w-0 flex-1 text-[13px]">
				<TaskNameInfoDisplay task={task} />
			</div>
			{isPast && <PastStatus status={task.status} statuses={statuses} />}
			<TaskEstimate _task={task} showEditAndSaveButton={!isPast} className="w-28 shrink-0" />
			<span className="flex size-7 shrink-0 items-center justify-center">
				{isPending && <Spinner aria-hidden="true" className="size-4 animate-spin text-muted-foreground" />}
				{!isPending && <PlanTaskMenu {...props} />}
			</span>
		</li>
	);
});

interface PlanTaskListProps extends PlanTaskRowActions {
	tasks: TTask[];
	pendingAdditions: PendingPlanAddition[];
	isToday: boolean;
	isPast: boolean;
	canEdit: boolean;
	defaultTaskId: string | undefined;
	pendingTaskId: string | null;
}

export function PlanTaskList({
	tasks,
	pendingAdditions,
	isToday,
	isPast,
	canEdit,
	defaultTaskId,
	pendingTaskId,
	...actions
}: Readonly<PlanTaskListProps>) {
	const { taskStatuses } = useTaskStatusesQuery();
	const statuses = useMemo(() => {
		if (!isPast) {
			return [];
		}
		return taskStatuses;
	}, [isPast, taskStatuses]);
	return (
		<ul className="flex flex-col hairline-divide-y divide-border">
			{tasks.map((task) => (
				<PlanTaskRow
					key={task.id}
					task={task}
					isToday={isToday}
					isPast={isPast}
					canEdit={canEdit}
					isDefault={task.id === defaultTaskId}
					isPending={task.id === pendingTaskId}
					statuses={statuses}
					{...actions}
				/>
			))}
			{pendingAdditions.map((addition) => (
				<PendingPlanTaskRow key={addition.key} addition={addition} isToday={isToday} />
			))}
		</ul>
	);
}
