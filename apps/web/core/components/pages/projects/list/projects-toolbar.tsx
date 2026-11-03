'use client';

import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { DatePickerWithRange } from '@/core/components/common/date-range-select';
import { controlGroupRecipe } from '@/core/components/common/input';
import { SegmentedControl } from '@/core/components/common/segmented-control';
import { Button } from '@/core/components/duplicated-components/_button';
import { Plus, Search, X } from '@/core/components/icons';
import type { PropertyFilterCategory } from '@/core/components/tasks/property-filter-menu';
import type { ProjectsListState } from '@/core/hooks/projects/use-projects-list-state';
import { cn } from '@/core/lib/helpers';
import type { ProjectFilterField, ProjectScope } from '@/core/lib/utils/project-list';
import { SegmentCountSkeleton } from '@/core/components/common/skeleton/segmented-control-skeleton';
import { AppliedProjectFilters, ProjectsFilterMenu } from './projects-filters';
import { ProjectsDisplayMenu } from './projects-display-menu';
import { PROJECTS_TOOLBAR_SEPARATOR, ProjectsCountSkeleton } from './projects-list-states';

const SEARCH_DEBOUNCE_MS = 150;

function ProjectsSearchField({ value, onChange }: Readonly<{ value: string; onChange: (value: string) => void }>) {
	const t = useTranslations();
	const [draft, setDraft] = useState(value);

	useEffect(() => {
		setDraft(value);
	}, [value]);

	useEffect(() => {
		const isPending = draft !== value;
		if (!isPending) {
			return;
		}
		const timeout = window.setTimeout(() => onChange(draft), SEARCH_DEBOUNCE_MS);
		return () => window.clearTimeout(timeout);
	}, [draft, onChange, value]);

	const hasDraft = draft.length > 0;
	const placeholder = t('pages.projects.list.SEARCH_PLACEHOLDER');

	return (
		<label className={cn(controlGroupRecipe, 'h-8 w-full gap-2 bg-card px-2.5 sm:w-60')}>
			<Search className="size-4 shrink-0 text-muted-foreground" />
			<input
				type="search"
				value={draft}
				onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft(event.target.value)}
				placeholder={placeholder}
				aria-label={placeholder}
				className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/75 [&::-webkit-search-cancel-button]:hidden"
			/>
			{hasDraft && (
				<button
					type="button"
					aria-label={t('common.CLEAR')}
					onClick={() => setDraft('')}
					className="flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
				>
					<X className="size-3.5" />
				</button>
			)}
		</label>
	);
}

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
					<ProjectsSearchField value={list.search} onChange={list.setSearch} />
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
