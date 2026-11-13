'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { DatePickerWithRange } from '@/core/components/common/date-range-select';
import { ListSearchField } from '@/core/components/common/list-search-field';
import { SegmentedControl } from '@/core/components/common/segmented-control';
import { Button } from '@/core/components/duplicated-components/_button';
import { Plus } from '@/core/components/icons';
import type { PropertyFilterCategory } from '@/core/components/tasks/property-filter-menu';
import type { ProjectsListState } from '@/core/hooks/projects/use-projects-list-state';
import type { ProjectFilterField, ProjectScope } from '@/core/lib/utils/project-list';
import { SegmentCountSkeleton } from '@/core/components/common/skeleton/segmented-control-skeleton';
import { AppliedProjectFilters, ProjectsFilterMenu } from './projects-filters';
import { ProjectsDisplayMenu } from './projects-display-menu';
import { PROJECTS_TOOLBAR_SEPARATOR, ProjectsCountSkeleton } from './projects-list-states';

export interface ProjectScopeCounts {
	active: number;
	archived: number;
}

function scopeItemOf(value: ProjectScope, label: string, count: number, isLoading: boolean) {
	if (isLoading) {
		return {
			value,
			label: (
				<>
					{label}
					<SegmentCountSkeleton />
				</>
			)
		};
	}
	return { value, label, count };
}

function dateRangeKeyOf(list: ProjectsListState) {
	const from = list.dateRange?.from?.toISOString() ?? '';
	const to = list.dateRange?.to?.toISOString() ?? '';
	return `${from}:${to}`;
}

export function ProjectsToolbar({
	list,
	categories,
	counts,
	shownCount,
	isLoading,
	exportMenu,
	onCreate
}: Readonly<{
	list: ProjectsListState;
	categories: PropertyFilterCategory<ProjectFilterField>[];
	counts: ProjectScopeCounts;
	shownCount: number;
	isLoading: boolean;
	exportMenu: ReactNode;
	onCreate: () => void;
}>) {
	const t = useTranslations();
	const scopeItems = [
		scopeItemOf('active', t('pages.projects.list.SCOPE_ACTIVE'), counts.active, isLoading),
		scopeItemOf('archived', t('pages.projects.list.SCOPE_ARCHIVED'), counts.archived, isLoading)
	];

	return (
		<div className="px-4">
			<div className="flex min-h-14 flex-wrap items-center justify-between gap-3 py-2.5">
				<div className="flex min-w-0 items-baseline gap-2">
					<h1 className="truncate text-lg font-semibold text-foreground">
						{t('pages.projects.projectTitle.PLURAL')}
					</h1>
					{isLoading && <ProjectsCountSkeleton />}
					{!isLoading && (
						<span className="text-xs tabular-nums text-muted-foreground">
							{t('pages.projects.list.COUNT', { count: shownCount })}
						</span>
					)}
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<SegmentedControl<ProjectScope>
						items={scopeItems}
						value={list.scope}
						onValueChange={list.setScope}
						ariaLabel={t('pages.projects.list.SCOPE_LABEL')}
					/>
					<span className={PROJECTS_TOOLBAR_SEPARATOR} />
					{exportMenu}
					<Button variant="default" size="default" onClick={onCreate}>
						<Plus />
						<span>{t('pages.projects.list.CREATE_PROJECT')}</span>
					</Button>
				</div>
			</div>
			<div className="flex flex-wrap items-center justify-between gap-2 pb-3">
				<div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
					<ListSearchField
						value={list.search}
						onChange={list.setSearch}
						placeholder={t('pages.projects.list.SEARCH_PLACEHOLDER')}
					/>
					<AppliedProjectFilters list={list} categories={categories} />
				</div>
				<div className="flex items-center gap-2">
					<DatePickerWithRange
						key={dateRangeKeyOf(list)}
						defaultValue={list.dateRange}
						onChange={list.setDateRange}
						className="h-8 w-auto max-w-[16rem] text-[13px]"
					/>
					<ProjectsFilterMenu list={list} categories={categories} />
					<ProjectsDisplayMenu list={list} />
				</div>
			</div>
		</div>
	);
}
