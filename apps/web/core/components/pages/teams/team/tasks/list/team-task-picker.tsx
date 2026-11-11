'use client';

import { useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useLocale, useTranslations } from 'next-intl';
import { Calendar as CalendarGrid } from '@/core/components/common/calendar';
import { Popover, PopoverContent } from '@/core/components/common/popover';
import { DropdownMenu, DropdownMenuContent } from '@/core/components/common/dropdown-menu';
import { SelectedMark } from '@/core/components/common/selected-mark';
import { Calendar, ChevronRight, X } from '@/core/components/icons';
import { TaskPropertyIcon } from '@/core/components/tasks/task-property-icon';
import {
	MENU_ROW_RECIPE,
	TaskPropertyMenu,
	type TaskPropertyMenuOption
} from '@/core/components/tasks/task-property-menu';
import { TaskAssigneeMenuItem } from '@/core/components/tasks/task-assignee-items';
import { PersonAvatar, personFromTeamMember } from '@/core/components/teams/people-avatars';
import { useTaskPrioritiesValue } from '@/core/hooks/tasks/use-task-priorities-value';
import { useTaskSizesValue } from '@/core/hooks/tasks/use-task-sizes-value';
import { useTaskLabelsValue } from '@/core/hooks/tasks/use-task-labels-value';
import { useTeamTaskUpdates } from '@/core/hooks/tasks/use-team-task-updates';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import { activeTeamState } from '@/core/stores';
import { cn } from '@/core/lib/helpers';
import { statusIdOf } from '@/core/lib/utils/kanban-board';
import { issueTypeChoicesFor, priorityRankOf } from '@/core/lib/utils/team-tasks-view';
import type { TStatus } from '@/core/types/interfaces/task/task-card';
import type { TOrganizationTeamEmployee, TTaskStatus } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import type { TeamTaskPickerKind } from './team-tasks-list-context';

export interface TeamTaskPickerTarget {
	kind: TeamTaskPickerKind;
	taskIds: string[];
	anchor: Element;
	/** The key that opened it, shown on the search line. */
	shortcut?: string;
}

interface PickerProps {
	tasks: TTask[];
	taskIds: string[];
	anchor: Element;
	shortcut?: string;
	isOpen: boolean;
	onOpenChange: (isOpen: boolean) => void;
	onOpenChangeComplete: (isOpen: boolean) => void;
}

function readableName(value: string | null | undefined) {
	const text = value ?? '';
	return text.split('-').join(' ');
}

function sharedBy<T>(tasks: TTask[], read: (task: TTask) => T, value: T) {
	const hasTasks = tasks.length > 0;
	return hasTasks && tasks.every((task) => read(task) === value);
}

function optionsOf(values: TStatus<string>, kind: 'priority' | 'size') {
	return Object.entries(values).map(([key, item]) => {
		const value = item.value || key;
		const option: TaskPropertyMenuOption<string> = {
			key: value,
			value,
			label: readableName(item.name ?? value),
			icon: <TaskPropertyIcon kind={kind} name={value} color={item.bgColor} />
		};
		return option;
	});
}

function StatusPicker({ statuses, ...props }: PickerProps & { statuses: TTaskStatus[] }) {
	const t = useTranslations();
	const { setStatus } = useTeamTaskUpdates();
	const options = useMemo(
		() =>
			statuses.map((status) => ({
				key: status.id,
				value: status,
				label: readableName(status.name),
				icon: <TaskPropertyIcon kind="status" name={status.name} color={status.color} />
			})),
		[statuses]
	);
	const isSelected = (status: TTaskStatus) => sharedBy(props.tasks, (task) => statusIdOf(task, statuses), status.id);
	return (
		<TaskPropertyMenu
			options={options}
			isSelected={isSelected}
			onSelect={(status) => setStatus(props.taskIds, status)}
			searchPlaceholder={t('taskMenus.search.status')}
			optionLabelClassName="capitalize"
			open={props.isOpen}
			onOpenChange={props.onOpenChange}
			onOpenChangeComplete={props.onOpenChangeComplete}
			anchor={props.anchor}
			searchShortcut={props.shortcut}
		/>
	);
}

function PriorityPicker(props: Readonly<PickerProps>) {
	const t = useTranslations();
	const { setPriority } = useTeamTaskUpdates();
	const priorityValues = useTaskPrioritiesValue();
	const options = useMemo(() => {
		const byRank = (first: TaskPropertyMenuOption<string>, second: TaskPropertyMenuOption<string>) =>
			priorityRankOf(first.value) - priorityRankOf(second.value);
		return optionsOf(priorityValues, 'priority').sort(byRank);
	}, [priorityValues]);
	const isSelected = (value: string) => sharedBy(props.tasks, (task) => task.priority as string | null, value);
	return (
		<TaskPropertyMenu
			options={options}
			isSelected={isSelected}
			onSelect={(value) => setPriority(props.taskIds, value)}
			searchPlaceholder={t('taskMenus.search.priority')}
			optionLabelClassName="capitalize"
			open={props.isOpen}
			onOpenChange={props.onOpenChange}
			onOpenChangeComplete={props.onOpenChangeComplete}
			anchor={props.anchor}
			searchShortcut={props.shortcut}
		/>
	);
}

function SizePicker(props: Readonly<PickerProps>) {
	const t = useTranslations();
	const { setSize } = useTeamTaskUpdates();
	const sizeValues = useTaskSizesValue();
	const options = useMemo(() => optionsOf(sizeValues, 'size'), [sizeValues]);
	const isSelected = (value: string) => sharedBy(props.tasks, (task) => task.size as string | null, value);
	return (
		<TaskPropertyMenu
			options={options}
			isSelected={isSelected}
			onSelect={(value) => setSize(props.taskIds, value)}
			searchPlaceholder={t('taskMenus.search.size')}
			optionLabelClassName="capitalize"
			open={props.isOpen}
			onOpenChange={props.onOpenChange}
			onOpenChangeComplete={props.onOpenChangeComplete}
			anchor={props.anchor}
			searchShortcut={props.shortcut}
		/>
	);
}

function IssueTypePicker(props: Readonly<PickerProps>) {
	const t = useTranslations();
	const { setIssueType } = useTeamTaskUpdates();
	const task = props.tasks[0];
	const options = useMemo(() => {
		const choices = issueTypeChoicesFor(task);
		return choices.map((issueType) => ({
			key: issueType,
			value: issueType as string,
			label: issueType,
			icon: <TaskPropertyIcon kind="issueType" name={issueType} />
		}));
	}, [task]);
	const isSelected = (value: string) => task?.issueType === value;
	return (
		<TaskPropertyMenu
			options={options}
			isSelected={isSelected}
			onSelect={(value) => setIssueType(props.taskIds, value)}
			searchPlaceholder={t('taskMenus.search.issueType')}
			open={props.isOpen}
			onOpenChange={props.onOpenChange}
			onOpenChangeComplete={props.onOpenChangeComplete}
			anchor={props.anchor}
			searchShortcut={props.shortcut}
		/>
	);
}

function LabelsPicker(props: Readonly<PickerProps>) {
	const t = useTranslations();
	const { toggleLabel } = useTeamTaskUpdates();
	const labelValues = useTaskLabelsValue();
	const task = props.tasks[0];
	const options = useMemo(
		() =>
			Object.entries(labelValues).map(([key, item]) => {
				const name = item.name ?? key;
				return {
					key: item.id ?? name,
					value: name,
					label: name,
					icon: <TaskPropertyIcon kind="label" name={name} color={item.bgColor} />
				};
			}),
		[labelValues]
	);
	const labelNames = new Set((task?.tags ?? []).map((tag) => tag.name));
	const isSelected = (name: string) => labelNames.has(name);
	const handleSelect = (name: string) => {
		if (!task) {
			return;
		}
		toggleLabel(props.taskIds, name);
	};
	return (
		<TaskPropertyMenu
			multiple={true}
			options={options}
			isSelected={isSelected}
			onSelect={handleSelect}
			searchPlaceholder={t('taskMenus.search.label')}
			open={props.isOpen}
			onOpenChange={props.onOpenChange}
			onOpenChangeComplete={props.onOpenChangeComplete}
			anchor={props.anchor}
			searchShortcut={props.shortcut}
		/>
	);
}

function teamMembersOf(members: TOrganizationTeamEmployee[] | null | undefined) {
	return members ?? [];
}

/** One task: the members toggle on and off, each with the app's own assignment hook. */
function TaskAssigneesPicker(props: Readonly<PickerProps>) {
	const activeTeam = useAtomValue(activeTeamState);
	const members = teamMembersOf(activeTeam?.members);
	const task = props.tasks[0];
	return (
		<DropdownMenu
			open={props.isOpen}
			onOpenChange={props.onOpenChange}
			onOpenChangeComplete={props.onOpenChangeComplete}
		>
			<DropdownMenuContent anchor={props.anchor} align="start" sideOffset={4} className="max-h-80 w-60">
				{task && members.map((member) => <TaskAssigneeMenuItem key={member.id} task={task} member={member} />)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

/** A selection: the picked member is added to every task that does not have them yet. */
function SelectionAssigneePicker(props: Readonly<PickerProps>) {
	const t = useTranslations();
	const activeTeam = useAtomValue(activeTeamState);
	const { assignMember } = useTeamTaskUpdates();
	const members = teamMembersOf(activeTeam?.members);
	const options = useMemo(
		() =>
			members.map((member) => {
				const person = personFromTeamMember(member);
				return {
					key: member.id,
					value: member,
					label: person.name,
					icon: <PersonAvatar person={person} className="size-4 text-[8px] ring-0" />
				};
			}),
		[members]
	);
	return (
		<TaskPropertyMenu
			options={options}
			isSelected={() => false}
			onSelect={(member) => assignMember(props.taskIds, member)}
			searchPlaceholder={t('pages.teamTasks.ASSIGN_TO')}
			open={props.isOpen}
			onOpenChange={props.onOpenChange}
			onOpenChangeComplete={props.onOpenChangeComplete}
			anchor={props.anchor}
			searchShortcut={props.shortcut}
		/>
	);
}

const DAY_MS = 24 * 60 * 60 * 1000;
const FRIDAY = 5;
const DAYS_IN_WEEK = 7;

function startOfToday() {
	const day = new Date();
	day.setHours(0, 0, 0, 0);
	return day;
}

function addDays(day: Date, count: number) {
	return new Date(day.getTime() + count * DAY_MS);
}

function daysUntilFriday(day: Date) {
	const weekday = day.getDay();
	return (FRIDAY - weekday + DAYS_IN_WEEK) % DAYS_IN_WEEK;
}

function startOfDayOf(value: Date | string | null | undefined) {
	if (!value) {
		return null;
	}
	const day = new Date(value);
	day.setHours(0, 0, 0, 0);
	return day;
}

/** The calendar refuses days before the task's start, as the task page's own date picker does. */
function disabledDaysOf(startDay: Date | null) {
	if (!startDay) {
		return undefined;
	}
	return { before: startDay };
}

function isBefore(day: Date, limit: Date | null) {
	if (!limit) {
		return false;
	}
	return day.getTime() < limit.getTime();
}

/** The due day every task has, or null when they differ (or have none). */
function sharedDueDayOf(tasks: TTask[]) {
	const days = tasks.map((item) => startOfDayOf(item.dueDate)?.getTime() ?? null);
	const [first] = days;
	if (first === null || first === undefined || days.some((day) => day !== first)) {
		return null;
	}
	return new Date(first);
}

interface DuePreset {
	key: string;
	label: string;
	day: Date;
}

/** Presets first, as Linear does; the month grid only renders once "Custom date" is asked for. */
function DueDatePicker(props: Readonly<PickerProps>) {
	const t = useTranslations();
	const locale = useLocale();
	const { setDueDate } = useTeamTaskUpdates();
	const [showsCalendar, setShowsCalendar] = useState(false);
	const task = props.tasks[0];
	const isSelection = props.tasks.length > 1;
	// A selection: no start date limits the days (each task keeps its own), and the day shows as picked only when
	// every task has it.
	const startDay = isSelection ? null : startOfDayOf(task?.startDate);
	const currentDue = sharedDueDayOf(props.tasks);
	const hasDueDate = props.tasks.some((item) => Boolean(item.dueDate));

	const presets = useMemo<DuePreset[]>(() => {
		const today = startOfToday();
		return [
			{ key: 'today', label: t('common.TODAY'), day: today },
			{ key: 'tomorrow', label: t('common.TOMORROW'), day: addDays(today, 1) },
			{ key: 'endOfWeek', label: t('pages.teamTasks.END_OF_WEEK'), day: addDays(today, daysUntilFriday(today)) },
			{ key: 'inOneWeek', label: t('pages.teamTasks.IN_ONE_WEEK'), day: addDays(today, DAYS_IN_WEEK) }
		];
	}, [t]);
	const dayFormat = useMemo(
		() => new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }),
		[locale]
	);

	const pick = (day: Date | null) => {
		if (!task) {
			return;
		}
		setDueDate(
			props.tasks.map((item) => item.id),
			day
		);
		props.onOpenChange(false);
	};

	return (
		<Popover
			open={props.isOpen}
			onOpenChange={props.onOpenChange}
			onOpenChangeComplete={props.onOpenChangeComplete}
		>
			<PopoverContent anchor={props.anchor} align="start" sideOffset={4} className="w-auto min-w-60 p-1">
				{!showsCalendar && (
					<div role="menu" aria-label={t('pages.taskDetails.DUE_DATE')} className="flex flex-col">
						{presets.map((preset) => {
							const isDisabled = isBefore(preset.day, startDay);
							const isCurrent = currentDue?.getTime() === preset.day.getTime();
							return (
								<button
									key={preset.key}
									type="button"
									role="menuitem"
									disabled={isDisabled}
									onClick={() => pick(preset.day)}
									className={cn(
										MENU_ROW_RECIPE,
										'hover:bg-foreground/5 focus-visible:bg-foreground/5 disabled:pointer-events-none disabled:opacity-50'
									)}
								>
									<Calendar className="size-4 shrink-0 text-muted-foreground" />
									<span className="flex-1 text-left">{preset.label}</span>
									<span className="text-xs tabular-nums text-muted-foreground">
										{dayFormat.format(preset.day)}
									</span>
									{isCurrent && <SelectedMark />}
								</button>
							);
						})}
						<button
							type="button"
							role="menuitem"
							onClick={() => setShowsCalendar(true)}
							className={cn(MENU_ROW_RECIPE, 'hover:bg-foreground/5 focus-visible:bg-foreground/5')}
						>
							<Calendar className="size-4 shrink-0 text-muted-foreground" />
							<span className="flex-1 text-left">{t('pages.teamTasks.CUSTOM_DATE')}</span>
							<ChevronRight className="size-4 text-muted-foreground" />
						</button>
						{hasDueDate && (
							<>
								<span className="-mx-1 my-1 h-px bg-border" aria-hidden="true" />
								<button
									type="button"
									role="menuitem"
									onClick={() => pick(null)}
									className={cn(
										MENU_ROW_RECIPE,
										'text-destructive-ink hover:bg-destructive/10 focus-visible:bg-destructive/10'
									)}
								>
									<X className="size-4 shrink-0" />
									<span className="flex-1 text-left">{t('pages.teamTasks.REMOVE_DUE_DATE')}</span>
								</button>
							</>
						)}
					</div>
				)}
				{showsCalendar && (
					<CalendarGrid
						mode="single"
						selected={currentDue ?? undefined}
						onSelect={(day) => pick(day ?? null)}
						disabled={disabledDaysOf(startDay)}
						initialFocus={true}
					/>
				)}
			</PopoverContent>
		</Popover>
	);
}

const NO_PROJECT = '__no-project';

/** The project of one task or a selection; "No project" takes them out of any. */
function ProjectPicker(props: Readonly<PickerProps>) {
	const t = useTranslations();
	const { setProject } = useTeamTaskUpdates();
	const { organizationProjects } = useOrganizationProjectsQuery();
	const options = useMemo(() => {
		const icon = <TaskPropertyIcon kind="project" className="size-4" />;
		const projects = organizationProjects
			.filter((project) => !project.isArchived && !project.archivedAt)
			.map<TaskPropertyMenuOption<string>>((project) => ({
				key: project.id,
				value: project.id,
				label: project.name ?? '',
				icon
			}))
			.sort((first, second) => first.label.localeCompare(second.label));
		const none: TaskPropertyMenuOption<string> = {
			key: NO_PROJECT,
			value: NO_PROJECT,
			label: t('pages.teamTasks.NO_PROJECT'),
			icon: <X className="size-4 text-muted-foreground" />
		};
		return [none, ...projects];
	}, [organizationProjects, t]);
	const isSelected = (value: string) =>
		sharedBy(props.tasks, (task) => task.projectId ?? NO_PROJECT, value);
	return (
		<TaskPropertyMenu
			options={options}
			isSelected={isSelected}
			onSelect={(value) => setProject(props.taskIds, value === NO_PROJECT ? null : value)}
			searchPlaceholder={t('pages.teamTasks.SEARCH_PROJECT')}
			open={props.isOpen}
			onOpenChange={props.onOpenChange}
			onOpenChangeComplete={props.onOpenChangeComplete}
			anchor={props.anchor}
			searchShortcut={props.shortcut}
		/>
	);
}

/**
 * The one picker of the list: whichever cell, menu row, key or bulk action asked for it, it opens against that
 * element and applies to the tasks it was given. It mounts only while open.
 */
export function TeamTaskPicker({
	target,
	isOpen,
	statuses,
	taskById,
	onOpenChange,
	onClosed
}: Readonly<{
	target: TeamTaskPickerTarget | null;
	isOpen: boolean;
	statuses: TTaskStatus[];
	taskById: Map<string, TTask>;
	onOpenChange: (isOpen: boolean) => void;
	onClosed: () => void;
}>) {
	if (!target) {
		return null;
	}
	const tasks = target.taskIds.map((taskId) => taskById.get(taskId)).filter((task): task is TTask => Boolean(task));
	const handleOpenChangeComplete = (open: boolean) => {
		if (!open) {
			onClosed();
		}
	};
	const props: PickerProps = {
		tasks,
		taskIds: target.taskIds,
		anchor: target.anchor,
		shortcut: target.shortcut,
		isOpen,
		onOpenChange,
		onOpenChangeComplete: handleOpenChangeComplete
	};
	const isSelection = target.taskIds.length > 1;
	if (target.kind === 'status') {
		return <StatusPicker statuses={statuses} {...props} />;
	}
	if (target.kind === 'priority') {
		return <PriorityPicker {...props} />;
	}
	if (target.kind === 'size') {
		return <SizePicker {...props} />;
	}
	if (target.kind === 'issueType') {
		return <IssueTypePicker {...props} />;
	}
	if (target.kind === 'labels') {
		return <LabelsPicker {...props} />;
	}
	if (target.kind === 'dueDate') {
		return <DueDatePicker {...props} />;
	}
	if (target.kind === 'project') {
		return <ProjectPicker {...props} />;
	}
	if (isSelection) {
		return <SelectionAssigneePicker {...props} />;
	}
	return <TaskAssigneesPicker {...props} />;
}
