'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/components/common/avatar';
import { EntityTile } from '@/core/components/common/entity-tile';
import { Folder, Task, Users, X } from '@/core/components/icons';
import {
	PropertyFilterMenu,
	type PropertyFilterCategory,
	type PropertyFilterOption
} from '@/core/components/tasks/property-filter-menu';
import { TaskPropertyIcon } from '@/core/components/tasks/task-property-icon';
import {
	type TimesheetFilterField,
	type TimesheetFilterSelection
} from '@/core/hooks/dashboards/timesheets/use-timesheets-page';
import { imgTitle } from '@/core/lib/helpers/index';
import { NO_PROJECT_VALUE, NO_TASK_VALUE, projectValueOf, taskValueOf } from '@/core/lib/utils/dashboards/timesheets';
import type { TOrganizationTeamEmployee } from '@/core/types/schemas';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

function PersonAvatar({ name, imageUrl }: Readonly<{ name: string; imageUrl?: string | null }>) {
	return (
		<Avatar className="size-4">
			<AvatarImage src={imageUrl ?? undefined} alt="" loading="lazy" />
			<AvatarFallback className="text-[7px]">{imgTitle(name)}</AvatarFallback>
		</Avatar>
	);
}

function byName(first: PropertyFilterOption, second: PropertyFilterOption) {
	const firstName = first.name ?? '';
	const secondName = second.name ?? '';
	return firstName.localeCompare(secondName);
}

function memberOptionsOf(members: ReadonlyArray<TOrganizationTeamEmployee>): PropertyFilterOption[] {
	const byEmployee = new Map<string, PropertyFilterOption>();
	for (const member of members) {
		const employeeId = member.employee?.id ?? member.employeeId;
		const isKnown = !employeeId || byEmployee.has(employeeId);
		if (isKnown) {
			continue;
		}
		const name = member.employee?.fullName ?? member.fullName ?? '';
		const imageUrl = member.employee?.user?.imageUrl;
		byEmployee.set(employeeId, { value: employeeId, name, icon: <PersonAvatar name={name} imageUrl={imageUrl} /> });
	}
	const options = [...byEmployee.values()];
	options.sort(byName);
	return options;
}

function projectOptionsOf(logs: ReadonlyArray<ITimeLog>, noProjectLabel: string): PropertyFilterOption[] {
	const byProject = new Map<string, PropertyFilterOption>();
	let hasLogWithoutProject = false;
	for (const log of logs) {
		const value = projectValueOf(log);
		if (value === NO_PROJECT_VALUE) {
			hasLogWithoutProject = true;
			continue;
		}
		if (byProject.has(value)) {
			continue;
		}
		const project = log.project;
		const name = project?.name ?? value;
		const icon = (
			<EntityTile name={name} color={project?.color} imageUrl={project?.imageUrl} className="size-4 text-[7px]" />
		);
		byProject.set(value, { value, name, icon });
	}
	const options = [...byProject.values()];
	options.sort(byName);
	if (hasLogWithoutProject) {
		options.push({ value: NO_PROJECT_VALUE, name: noProjectLabel, icon: <Folder /> });
	}
	return options;
}

function taskOptionsOf(logs: ReadonlyArray<ITimeLog>, noTaskLabel: string): PropertyFilterOption[] {
	const byTask = new Map<string, PropertyFilterOption>();
	let hasLogWithoutTask = false;
	for (const log of logs) {
		const value = taskValueOf(log);
		if (value === NO_TASK_VALUE) {
			hasLogWithoutTask = true;
			continue;
		}
		if (byTask.has(value)) {
			continue;
		}
		const name = log.task?.title ?? value;
		const icon = <TaskPropertyIcon kind="issueType" name={log.task?.issueType} />;
		byTask.set(value, { value, name, icon });
	}
	const options = [...byTask.values()];
	options.sort(byName);
	if (hasLogWithoutTask) {
		options.push({ value: NO_TASK_VALUE, name: noTaskLabel, icon: <Task /> });
	}
	return options;
}

/**
 * The filter menu's properties. Members (for those who may see others) come from the active team and are sent to
 * Gauzy; projects and tasks are the ones worked in the period and narrow the loaded logs, so picking one is
 * instant and the menu never lists a value with nothing behind it.
 */
export function useTimesheetFilterCategories({
	isManage,
	members,
	logs
}: Readonly<{
	isManage: boolean;
	members: ReadonlyArray<TOrganizationTeamEmployee>;
	logs: ReadonlyArray<ITimeLog>;
}>) {
	const t = useTranslations();
	return useMemo<PropertyFilterCategory<TimesheetFilterField>[]>(() => {
		const categories: PropertyFilterCategory<TimesheetFilterField>[] = [];
		if (isManage) {
			categories.push({
				field: 'members',
				keepsCase: true,
				icon: <Users />,
				label: t('common.MEMBERS'),
				options: memberOptionsOf(members)
			});
		}
		categories.push(
			{
				field: 'projects',
				keepsCase: true,
				icon: <Folder />,
				label: t('dashboard.timesheets.PROJECTS'),
				options: projectOptionsOf(logs, t('dashboard.timesheets.NO_PROJECT'))
			},
			{
				field: 'tasks',
				keepsCase: true,
				icon: <Task />,
				label: t('common.TASKS'),
				options: taskOptionsOf(logs, t('dashboard.timesheets.NO_TASK'))
			}
		);
		return categories;
	}, [isManage, logs, members, t]);
}

interface AppliedFilter {
	field: TimesheetFilterField;
	value: string;
	fieldLabel: string;
	name: string;
	icon: PropertyFilterOption['icon'];
}

function appliedFiltersOf(
	filters: TimesheetFilterSelection,
	categories: ReadonlyArray<PropertyFilterCategory<TimesheetFilterField>>,
	knownNames: Readonly<Record<string, string>>
): AppliedFilter[] {
	const applied: AppliedFilter[] = [];
	for (const category of categories) {
		for (const value of filters[category.field]) {
			const option = category.options.find((candidate) => candidate.value === value);
			const name = option?.name ?? knownNames[value] ?? value;
			applied.push({ field: category.field, value, fieldLabel: category.label, name, icon: option?.icon });
		}
	}
	return applied;
}

/**
 * The filter menu and the chips of what it applies, sharing the names seen when a value was picked: a project
 * picked in one period keeps its name on its chip in a period where nothing was logged on it.
 */
export function useTimesheetFilterControls({
	filters,
	categories,
	onChange,
	onRemove,
	onClear
}: Readonly<{
	filters: TimesheetFilterSelection;
	categories: ReadonlyArray<PropertyFilterCategory<TimesheetFilterField>>;
	onChange: (field: TimesheetFilterField, values: string[]) => void;
	onRemove: (field: TimesheetFilterField, value: string) => void;
	onClear: () => void;
}>) {
	const t = useTranslations();
	const [knownNames, setKnownNames] = useState<Record<string, string>>({});

	const handleChange = useCallback(
		(field: TimesheetFilterField, values: string[]) => {
			const category = categories.find((candidate) => candidate.field === field);
			const pickedNames: Record<string, string> = {};
			for (const option of category?.options ?? []) {
				const isPicked = values.includes(option.value);
				if (isPicked) {
					pickedNames[option.value] = option.name ?? option.value;
				}
			}
			setKnownNames((current) => ({ ...current, ...pickedNames }));
			onChange(field, values);
		},
		[categories, onChange]
	);

	const applied = appliedFiltersOf(filters, categories, knownNames);
	const hasApplied = applied.length > 0;

	const menu = (
		<PropertyFilterMenu
			categories={[...categories]}
			selection={filters}
			onChange={handleChange}
			onClear={onClear}
		/>
	);

	const chips = hasApplied && (
		<div className="flex min-w-0 flex-wrap items-center gap-1.5 pb-3">
			{applied.map((filter) => (
				<span
					key={`${filter.field}:${filter.value}`}
					className="inline-flex h-7 max-w-64 items-center gap-1.5 rounded-full bg-card pr-1 pl-2.5 text-xs hairline-ring ring-foreground/10"
				>
					<span className="shrink-0 text-muted-foreground">{filter.fieldLabel}:</span>
					{filter.icon && (
						<span className="flex size-4 shrink-0 items-center justify-center">{filter.icon}</span>
					)}
					<span className="truncate font-medium text-foreground">{filter.name}</span>
					<button
						type="button"
						aria-label={t('dashboard.timesheets.REMOVE_FILTER', { value: filter.name })}
						onClick={() => onRemove(filter.field, filter.value)}
						className="flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25"
					>
						<X className="size-3" />
					</button>
				</span>
			))}
			<button
				type="button"
				onClick={onClear}
				className="h-7 rounded-md px-2 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25"
			>
				{t('common.CLEAR_FILTERS')}
			</button>
		</div>
	);

	return { menu, chips };
}
