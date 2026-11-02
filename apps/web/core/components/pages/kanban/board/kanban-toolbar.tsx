'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import HeaderTabs from '@/core/components/common/header-tabs';
import { SegmentedControl, type SegmentedControlItem } from '@/core/components/common/segmented-control';
import { Button } from '@/core/components/duplicated-components/_button';
import { Plus, UserAdd, X } from '@/core/components/icons';
import { TaskPropertyIcon } from '@/core/components/tasks/task-property-icon';
import { TaskSearchField } from '@/core/components/tasks/task-search-field';
import {
	PropertyFilterMenu,
	propertyFilterOptionsOf,
	type PropertyFilterCategory,
	type PropertyFilterOption
} from '@/core/components/tasks/property-filter-menu';
import { useTaskPrioritiesValue } from '@/core/hooks/tasks/use-task-priorities-value';
import { useTaskSizesValue } from '@/core/hooks/tasks/use-task-sizes-value';
import { useTaskLabelsValue } from '@/core/hooks/tasks/use-task-labels-value';
import { userTimezone } from '@/core/lib/helpers/user-timezone';
import { activeTeamState } from '@/core/stores';
import { EIssueType } from '@/core/types/generics/enums/task';
import type { KanbanDay, KanbanFilterField } from '@/core/lib/utils/kanban-board';
import type { KanbanBoardState } from '@/core/hooks/tasks/use-kanban-board';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { AvatarStack, personFromTeamMember } from '@/core/components/teams/people-avatars';
import { KANBAN_TOOLBAR_SEPARATOR, KanbanTeamAvatarsSkeleton } from './kanban-page-skeleton';

const TEAM_AVATAR_COUNT = 5;

const ISSUE_TYPE_OPTIONS: PropertyFilterOption[] = Object.values(EIssueType).map((issueType) => ({
	value: issueType,
	name: issueType,
	icon: <TaskPropertyIcon kind="issueType" name={issueType} />
}));

function epicOptionsOf(epics: TTask[]): PropertyFilterOption[] {
	return epics.map((epic) => {
		const number = epic.taskNumber ?? epic.number;
		return {
			value: epic.id,
			name: `#${number} ${epic.title}`,
			icon: <TaskPropertyIcon kind="epic" />
		};
	});
}

function timezoneLabelOf(timezone: string) {
	const offset = timezone.split('(')[1] ?? '';
	return `(${offset}`;
}

function useFilterCategories(epics: TTask[]): PropertyFilterCategory<KanbanFilterField>[] {
	const t = useTranslations();
	const priorityValues = useTaskPrioritiesValue();
	const sizeValues = useTaskSizesValue();
	const labelValues = useTaskLabelsValue();
	return useMemo(
		() => [
			{ field: 'issueType', kind: 'issueType', label: t('common.ISSUE_TYPE'), options: ISSUE_TYPE_OPTIONS },
			{ field: 'epic', kind: 'epic', label: t('pages.taskDetails.EPIC'), options: epicOptionsOf(epics) },
			{
				field: 'priority',
				kind: 'priority',
				label: t('pages.taskDetails.PRIORITY'),
				options: propertyFilterOptionsOf(priorityValues)
			},
			{
				field: 'size',
				kind: 'size',
				label: t('pages.taskDetails.SIZE'),
				options: propertyFilterOptionsOf(sizeValues)
			},
			{ field: 'label', kind: 'label', label: t('common.LABELS'), options: propertyFilterOptionsOf(labelValues) }
		],
		[epics, labelValues, priorityValues, sizeValues, t]
	);
}

function MemberFilterChip({ name, onClear }: Readonly<{ name: string; onClear: () => void }>) {
	const t = useTranslations();
	return (
		<span className="inline-flex h-8 max-w-56 items-center gap-1.5 rounded-full bg-primary/[0.07] pr-1 pl-3 text-[13px] font-medium text-primary-ink hairline-ring ring-primary/25">
			<span className="truncate">{t('pages.kanban.ASSIGNED_TO', { name })}</span>
			<button
				type="button"
				aria-label={t('pages.kanban.SHOW_EVERY_MEMBER')}
				onClick={onClear}
				className="flex size-6 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-primary/10"
			>
				<X className="size-3.5" />
			</button>
		</span>
	);
}

/**
 * The toolbar band of the board, two fixed rows that never push the board: the title with the view switch, the
 * team and Invite; then the creation-day switch on the left and search, filters and Create task on the right.
 */
export function KanbanToolbar({
	board,
	canInvite,
	onInvite,
	onCreateTask
}: Readonly<{ board: KanbanBoardState; canInvite: boolean; onInvite: () => void; onCreateTask: () => void }>) {
	const t = useTranslations();
	const activeTeam = useAtomValue(activeTeamState);
	const categories = useFilterCategories(board.epics);
	const timezoneLabel = timezoneLabelOf(userTimezone());
	const teamPeople = (activeTeam?.members ?? []).map(personFromTeamMember);
	const isTeamLoading = !activeTeam;

	const dayItems = useMemo<SegmentedControlItem<KanbanDay>[]>(
		() => [
			{ value: 'all', label: t('common.FILTER_ALL') },
			{ value: 'today', label: t('common.TODAY') },
			{ value: 'yesterday', label: t('common.YESTERDAY') },
			{ value: 'tomorrow', label: t('common.TOMORROW') }
		],
		[t]
	);

	return (
		<div className="px-4">
			<div className="flex min-h-14 flex-wrap items-center justify-between gap-3 py-2.5">
				<div className="flex min-w-0 items-baseline gap-2">
					<h1 className="truncate text-lg font-semibold text-foreground">{t('pages.kanban.KANBAN_BOARD')}</h1>
					<span className="text-xs tabular-nums text-muted-foreground">{timezoneLabel}</span>
				</div>
				<div className="flex items-center gap-3">
					<HeaderTabs kanban={true} linkAll={true} />
					<span className={KANBAN_TOOLBAR_SEPARATOR} />
					{isTeamLoading && <KanbanTeamAvatarsSkeleton />}
					{!isTeamLoading && (
						<AvatarStack
							people={teamPeople}
							max={TEAM_AVATAR_COUNT}
							size="md"
							onPick={(person) => board.filterByEmployee(person.name)}
							pickLabel={(person) => t('pages.kanban.SHOW_MEMBER_TASKS', { name: person.name })}
						/>
					)}
					{canInvite && (
						<Button variant="outline" size="sm" onClick={onInvite}>
							<UserAdd />
							{t('common.INVITE')}
						</Button>
					)}
				</div>
			</div>
			<div className="flex flex-wrap items-center justify-between gap-3 pb-3">
				<SegmentedControl
					items={dayItems}
					value={board.day}
					onValueChange={board.setDay}
					ariaLabel={t('pages.kanban.CREATION_DAY')}
				/>
				<div className="flex flex-wrap items-center gap-2">
					{board.employee && <MemberFilterChip name={board.employee} onClear={board.clearEmployee} />}
					<TaskSearchField
						value={board.search}
						onChange={board.setSearch}
						placeholder={t('pages.kanban.SEARCH_TASKS')}
					/>
					<PropertyFilterMenu
						categories={categories}
						selection={board.properties}
						onChange={board.setPropertyFilter}
						onClear={board.clearPropertyFilters}
						triggerClassName="h-8"
					/>
					<Button size="sm" onClick={onCreateTask}>
						<Plus />
						{t('common.CREATE_TASK')}
					</Button>
				</div>
			</div>
		</div>
	);
}
