'use client';

import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { SegmentedControl, type SegmentedControlItem } from '@/core/components/common/segmented-control';
import { Button } from '@/core/components/duplicated-components/_button';
import { Plus, User } from '@/core/components/icons';
import { TaskPropertyIcon } from '@/core/components/tasks/task-property-icon';
import { TaskSearchField } from '@/core/components/tasks/task-search-field';
import { PersonAvatar, personFromTeamMember } from '@/core/components/teams/people-avatars';
import {
	PropertyFilterMenu,
	propertyFilterOptionsOf,
	type PropertyFilterCategory,
	type PropertyFilterOption
} from '@/core/components/tasks/property-filter-menu';
import { PageUpdatingBar } from '@/core/components/layouts/page-skeleton';
import { useTaskPrioritiesValue } from '@/core/hooks/tasks/use-task-priorities-value';
import { useTaskSizesValue } from '@/core/hooks/tasks/use-task-sizes-value';
import { useTaskLabelsValue } from '@/core/hooks/tasks/use-task-labels-value';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { activeTeamState } from '@/core/stores';
import { EIssueType } from '@/core/types/generics/enums/task';
import {
	NONE_VALUE,
	taskNumberLabel,
	type TeamTasksFilterField,
	type TeamTasksScope
} from '@/core/lib/utils/team-tasks-view';
import type { TeamTasksViewState } from '@/core/hooks/tasks/use-team-tasks-view';
import type { TOrganizationTeamEmployee, TTaskStatus } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { TeamTasksDisplayMenu } from './team-tasks-display-menu';
import { TeamTasksLayoutSwitch } from './team-tasks-layout-switch';

const ISSUE_TYPE_OPTIONS: PropertyFilterOption[] = [
	EIssueType.EPIC,
	EIssueType.STORY,
	EIssueType.TASK,
	EIssueType.BUG
].map((issueType) => ({
	value: issueType,
	name: issueType,
	icon: <TaskPropertyIcon kind="issueType" name={issueType} />
}));

function readableName(value: string | null | undefined) {
	const text = value ?? '';
	return text.split('-').join(' ');
}

function countOrNothing(count: number) {
	if (count === 0) {
		return undefined;
	}
	return count;
}

function statusOptionsOf(statuses: TTaskStatus[]): PropertyFilterOption[] {
	return statuses.map((status) => ({
		value: status.id,
		name: readableName(status.name),
		icon: (
			<TaskPropertyIcon
				kind="status"
				name={status.name}
				color={status.color}
				icon={status.icon}
				iconUrl={status.fullIconUrl}
			/>
		)
	}));
}

function projectOptionsOf(tasks: TTask[], projectNames: Map<string, string>, noProjectLabel: string) {
	const projectIds = new Set<string>();
	for (const task of tasks) {
		if (task.projectId) {
			projectIds.add(task.projectId);
		}
	}
	const options: PropertyFilterOption[] = [...projectIds].map((projectId) => ({
		value: projectId,
		name: projectNames.get(projectId) ?? projectId,
		icon: <TaskPropertyIcon kind="project" />
	}));
	options.sort((first, second) => (first.name ?? '').localeCompare(second.name ?? ''));
	return [{ value: NONE_VALUE, name: noProjectLabel, icon: <TaskPropertyIcon kind="project" /> }, ...options];
}

interface MemberEntry {
	employeeId: string;
	userId: string;
	name: string;
	imageUrl: string | null;
}

function memberEntriesOf(members: TOrganizationTeamEmployee[] | null | undefined): MemberEntry[] {
	return (members ?? []).map((member) => {
		const person = personFromTeamMember(member);
		return {
			employeeId: member.employeeId ?? member.employee?.id ?? '',
			userId: member.employee?.userId ?? '',
			name: person.name,
			imageUrl: person.imageUrl ?? null
		};
	});
}

function memberOption(entry: MemberEntry, name: string): PropertyFilterOption {
	const person = { id: entry.employeeId, name: entry.name, imageUrl: entry.imageUrl };
	return {
		value: entry.employeeId,
		name,
		icon: <PersonAvatar person={person} className="size-4 text-[8px] ring-0" />
	};
}

/** The signed-in member first, then the team by name, then "No assignee". */
function assigneeOptionsOf(
	entries: MemberEntry[],
	ownUserId: string | undefined,
	labels: { me: string; nobody: string }
) {
	const own = entries.find((entry) => entry.userId === ownUserId);
	const others = entries.filter((entry) => entry !== own);
	others.sort((first, second) => first.name.localeCompare(second.name));
	const options: PropertyFilterOption[] = [];
	if (own) {
		options.push(memberOption(own, `${own.name} (${labels.me})`));
	}
	for (const entry of others) {
		options.push(memberOption(entry, entry.name));
	}
	options.push({ value: NONE_VALUE, name: labels.nobody, icon: <User className="size-4 text-muted-foreground" /> });
	return options;
}

function epicOptionsOf(tasks: TTask[]): PropertyFilterOption[] {
	const epics = tasks.filter((task) => task.issueType === EIssueType.EPIC);
	return epics.map((epic) => ({
		value: epic.id,
		name: `${taskNumberLabel(epic)} ${epic.title}`.trim(),
		icon: <TaskPropertyIcon kind="epic" />
	}));
}

function useFilterCategories(view: TeamTasksViewState): PropertyFilterCategory<TeamTasksFilterField>[] {
	const t = useTranslations();
	const activeTeam = useAtomValue(activeTeamState);
	const { data: user } = useUserQuery();
	const priorityValues = useTaskPrioritiesValue();
	const sizeValues = useTaskSizesValue();
	const labelValues = useTaskLabelsValue();
	const { statuses, tasks, lookups } = view;
	// The team object is rebuilt on every presence refresh: its members are compared by their text.
	const memberSignature = JSON.stringify(memberEntriesOf(activeTeam?.members));
	const memberEntries = useMemo(() => JSON.parse(memberSignature) as MemberEntry[], [memberSignature]);

	return useMemo(
		() => [
			{
				field: 'status',
				kind: 'status',
				label: t('taskMenus.fields.status'),
				options: statusOptionsOf(statuses)
			},
			{
				field: 'priority',
				kind: 'priority',
				label: t('taskMenus.fields.priority'),
				options: propertyFilterOptionsOf(priorityValues)
			},
			{
				field: 'size',
				kind: 'size',
				label: t('taskMenus.fields.size'),
				options: propertyFilterOptionsOf(sizeValues)
			},
			{
				field: 'issueType',
				kind: 'issueType',
				label: t('taskMenus.fields.issueType'),
				options: ISSUE_TYPE_OPTIONS
			},
			{
				field: 'label',
				kind: 'label',
				label: t('taskMenus.fields.label'),
				options: propertyFilterOptionsOf(labelValues),
				keepsCase: true
			},
			{
				field: 'project',
				kind: 'project',
				label: t('taskMenus.fields.project'),
				options: projectOptionsOf(tasks, lookups.projectNames, t('pages.teamTasks.NO_PROJECT')),
				keepsCase: true
			},
			{
				field: 'assignee',
				icon: <User />,
				label: t('common.ASSIGNEE'),
				options: assigneeOptionsOf(memberEntries, user?.id, {
					me: t('pages.teamTasks.ME'),
					nobody: t('pages.teamTasks.NO_ASSIGNEE')
				}),
				keepsCase: true
			},
			{
				field: 'epic',
				kind: 'epic',
				label: t('pages.taskDetails.EPIC'),
				options: epicOptionsOf(tasks),
				keepsCase: true
			}
		],
		[t, statuses, priorityValues, sizeValues, labelValues, tasks, lookups.projectNames, memberEntries, user?.id]
	);
}

/**
 * The toolbar band of the page, two rows that never push the list: the title (the team's tasks, or the open view
 * and whether it changed) with what the team has, and the one primary action; then the scope on the left, and the
 * search, the filter menu, the Display popover and the view actions (Save view, or Save / Save as / Rename /
 * Share / Delete of the open view).
 */
export function TeamTasksToolbar({
	view,
	title,
	isDirty,
	note,
	trackedCount,
	isLoadingMore,
	onCreate,
	viewActions
}: Readonly<{
	view: TeamTasksViewState;
	title: string;
	isDirty: boolean;
	/** A word on the list next to the title (a built-in view showing part of its tasks). */
	note?: string;
	trackedCount: number;
	isLoadingMore: boolean;
	onCreate: () => void;
	viewActions?: React.ReactNode;
}>) {
	const t = useTranslations();
	const categories = useFilterCategories(view);
	const { scopeCounts } = view;
	const totalCount = view.tasks.length;
	const hasTracked = trackedCount > 0;

	const scopeItems = useMemo<SegmentedControlItem<TeamTasksScope>[]>(
		() => [
			{ value: 'active', label: t('pages.teamTasks.SCOPE_ACTIVE'), count: countOrNothing(scopeCounts.active) },
			{ value: 'done', label: t('pages.teamTasks.SCOPE_DONE'), count: countOrNothing(scopeCounts.done) },
			{ value: 'all', label: t('pages.teamTasks.SCOPE_ALL'), count: countOrNothing(scopeCounts.all) }
		],
		[scopeCounts.active, scopeCounts.all, scopeCounts.done, t]
	);

	return (
		<div className="px-4">
			<PageUpdatingBar isUpdating={isLoadingMore} label={t('dailyPlan.editor.TASKS_LOADING')} />
			<div className="flex min-h-14 flex-wrap items-center justify-between gap-3 py-2.5">
				<div className="flex min-w-0 items-baseline gap-2">
					<h1 className="truncate text-lg font-semibold text-foreground">{title}</h1>
					{isDirty && <span className="text-xs text-muted-foreground">{t('taskViews.UNSAVED')}</span>}
					{note && <span className="text-xs text-muted-foreground">{note}</span>}
					<span className="flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
						{t('pages.teamTasks.META_TASKS', { count: totalCount })}
						{hasTracked && (
							<>
								<span aria-hidden="true">·</span>
								<span className="flex items-center gap-1 text-success-foreground">
									<span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
									{t('pages.teamTasks.META_TRACKED', { count: trackedCount })}
								</span>
							</>
						)}
					</span>
				</div>
				<div className="flex flex-wrap items-center gap-3">
					<TeamTasksLayoutSwitch view={view} />
					<Button size="sm" onClick={onCreate}>
						<Plus />
						{t('pages.teamTasks.NEW_TASK')}
					</Button>
				</div>
			</div>
			<div className="flex flex-wrap items-center justify-between gap-3 pb-3">
				<SegmentedControl
					items={scopeItems}
					value={view.scope}
					onValueChange={view.setScope}
					ariaLabel={t('pages.teamTasks.SCOPE_LABEL')}
				/>
				<div className="flex flex-wrap items-center gap-2">
					<TaskSearchField
						value={view.search}
						onChange={view.setSearch}
						placeholder={t('pages.teamTasks.SEARCH_TASKS')}
						focusKey={true}
						className="max-sm:w-full"
					/>
					<PropertyFilterMenu
						categories={categories}
						selection={view.filters}
						onChange={view.setFilter}
						onClear={view.clearFilters}
						triggerClassName="h-8"
					/>
					<TeamTasksDisplayMenu view={view} />
					{viewActions}
				</div>
			</div>
		</div>
	);
}
