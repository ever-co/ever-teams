'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/components/common/avatar';
import { EntityTile } from '@/core/components/common/entity-tile';
import { Building, DollarCircle, Folder, Tag, Task, Users, X } from '@/core/components/icons';
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
import { BILLABLE_ONLY_VALUE, labelsOfLogs, type ReportClientChoice } from '@/core/lib/utils/dashboards/report-filters';
import { NO_PROJECT_VALUE, NO_TASK_VALUE, projectValueOf, taskValueOf } from '@/core/lib/utils/dashboards/timesheets';
import { NO_CLIENT_FILTER_VALUE } from '@/core/lib/utils/project-list';
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

function clientOptionsOf(clients: ReadonlyArray<ReportClientChoice>, noClientLabel: string): PropertyFilterOption[] {
	const options: PropertyFilterOption[] = [
		{ value: NO_CLIENT_FILTER_VALUE, name: noClientLabel, icon: <Building /> }
	];
	for (const client of clients) {
		const icon = <EntityTile name={client.name} className="size-4 text-[7px]" />;
		options.push({ value: client.id, name: client.name, icon });
	}
	return options;
}

function labelOptionsOf(logs: ReadonlyArray<ITimeLog>): PropertyFilterOption[] {
	const labels = labelsOfLogs(logs);
	return labels.map((label) => ({
		value: label.id,
		name: label.name,
		icon: <TaskPropertyIcon kind="label" name={label.name} color={label.color} />
	}));
}

/**
 * The filter menu's properties. Members (for those who may see others) come from the active team and are sent to
 * Gauzy; projects, tasks and labels are the ones worked in the period and narrow the loaded logs, so picking one is
 * instant and the menu never lists a value with nothing behind it. Clients are the active ones, and "No client".
 * The Client property is left out when the projects cannot be read, since nothing would tell a log's client; it
 * stays while a client is picked, so its chip can still be removed.
 */
export function useTimesheetFilterCategories({
	isManage,
	members,
	logs,
	clients,
	canFilterByClient,
	hasPickedClient
}: Readonly<{
	isManage: boolean;
	members: ReadonlyArray<TOrganizationTeamEmployee>;
	logs: ReadonlyArray<ITimeLog>;
	clients: ReadonlyArray<ReportClientChoice>;
	canFilterByClient: boolean;
	hasPickedClient: boolean;
}>) {
	const t = useTranslations();
	const showsClients = canFilterByClient || hasPickedClient;
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
		if (showsClients) {
			categories.push({
				field: 'clients',
				keepsCase: true,
				icon: <Building />,
				label: t('clients.TITLE'),
				options: clientOptionsOf(clients, t('common.NO_CLIENT'))
			});
		}
		categories.push(
			{
				field: 'billable',
				keepsCase: true,
				icon: <DollarCircle />,
				label: t('dashboard.timesheets.BILLABLE'),
				options: [
					{
						value: BILLABLE_ONLY_VALUE,
						name: t('timeReports.filters.BILLABLE_ONLY'),
						icon: <DollarCircle />
					}
				]
			},
			{
				field: 'labels',
				keepsCase: true,
				icon: <Tag />,
				label: t('common.LABELS'),
				options: labelOptionsOf(logs)
			}
		);
		return categories;
	}, [clients, isManage, logs, members, showsClients, t]);
}

interface AppliedFilter {
	field: TimesheetFilterField;
	value: string;
	fieldLabel: string;
	name: string;
	icon: PropertyFilterOption['icon'];
}

/** `unlistedName` stands for a value no option holds, such as a label of a shared link that this period lacks. */
function appliedFiltersOf(
	filters: TimesheetFilterSelection,
	categories: ReadonlyArray<PropertyFilterCategory<TimesheetFilterField>>,
	knownNames: Readonly<Record<string, string>>,
	unlistedName: string
): AppliedFilter[] {
	const applied: AppliedFilter[] = [];
	for (const category of categories) {
		for (const value of filters[category.field]) {
			const option = category.options.find((candidate) => candidate.value === value);
			const name = option?.name ?? knownNames[value] ?? unlistedName;
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

	const unlistedName = t('dashboard.timeActivity.filters.UNLISTED');
	const applied = useMemo(
		() => appliedFiltersOf(filters, categories, knownNames, unlistedName),
		[categories, filters, knownNames, unlistedName]
	);
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

	return { menu, chips, applied };
}
