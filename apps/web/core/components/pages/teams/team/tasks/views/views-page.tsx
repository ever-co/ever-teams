'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import { controlGroupRecipe } from '@/core/components/common/input';
import { SegmentedControl } from '@/core/components/common/segmented-control';
import { Button } from '@/core/components/duplicated-components/_button';
import { DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import { DashboardToolbar } from '@/core/components/dashboards/kit/dashboard-layout';
import { Plus, Search, X } from '@/core/components/icons';
import { useTaskViewsQuery } from '@/core/hooks/task-views/use-task-views-query';
import { cn } from '@/core/lib/helpers';
import { savedViewCountsOf, savedViewsShownOf, type SavedViewsFilter } from '@/core/lib/utils/task-views-index';
import { isTaskViewsEnabled } from '@/core/lib/utils/task-views-enabled';
import { ETaskViewVisibility, TASK_BUILT_IN_VIEWS } from '@/core/types/interfaces/common/task-views';
import { DeleteViewDialog } from './delete-view-dialog';
import { SaveViewDialog } from './save-view-dialog';
import { NEW_VIEW_PATH } from './use-new-view-request';
import { useSavedViewListCommands } from './use-saved-view-list-commands';
import { ViewsBreadcrumb } from './views-breadcrumb';
import {
	BuiltInViewCard,
	SavedViewRow,
	SavedViewsEmpty,
	SavedViewsNoMatch,
	SavedViewsSkeleton,
	ViewsSectionTitle
} from './views-index-parts';

function ViewsSearchField({ value, onChange }: Readonly<{ value: string; onChange: (value: string) => void }>) {
	const t = useTranslations();
	const placeholder = t('taskViews.SEARCH_PLACEHOLDER');
	return (
		<label className={cn(controlGroupRecipe, 'h-8 w-full gap-2 bg-card px-2.5 sm:w-60')}>
			<Search className="size-4 shrink-0 text-muted-foreground" />
			<input
				type="search"
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder={placeholder}
				aria-label={placeholder}
				className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/75 [&::-webkit-search-cancel-button]:hidden"
			/>
			{value && (
				<button
					type="button"
					aria-label={t('common.CLEAR')}
					onClick={() => onChange('')}
					className="flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
				>
					<X className="size-3.5" />
				</button>
			)}
		</label>
	);
}

/**
 * `/views`: the built-in views, each with the rule it lists by, then the team's saved views to search, filter by who
 * sees them, open, rename, share or delete. A new view starts on the team's tasks, where its filters are set.
 */
export function ViewsPage() {
	const t = useTranslations();
	const router = useRouter();
	const { views, isLoading, isError, refetch } = useTaskViewsQuery();
	const commands = useSavedViewListCommands();
	const [query, setQuery] = useState('');
	const [filter, setFilter] = useState<SavedViewsFilter>('all');
	const enabled = isTaskViewsEnabled();
	const title = t('taskViews.TITLE');
	const counts = savedViewCountsOf(views);
	// Counts only of a list that loaded: a failed one has none to tell, and its error says what happened
	const hasCounts = !isLoading && !isError;
	const shownViews = savedViewsShownOf(views, query, filter);
	const isNarrowed = query.trim() !== '' || filter !== 'all';
	const createView = () => router.push(NEW_VIEW_PATH);

	const breadcrumb = <ViewsBreadcrumb />;

	if (!enabled) {
		return (
			<PageLayout title={title} breadcrumb={breadcrumb} className="min-h-0 flex-1">
				<div className="flex h-full items-center justify-center p-4">
					<AnimatedEmptyState
						title={t('taskViews.UNAVAILABLE_TITLE')}
						message={t('taskViews.UNAVAILABLE_TEXT')}
					/>
				</div>
			</PageLayout>
		);
	}

	const filterItems = [
		{ value: 'all' as const, label: t('taskViews.FILTER_ALL'), count: hasCounts ? counts.all : undefined },
		{ value: 'personal' as const, label: t('taskViews.PERSONAL'), count: hasCounts ? counts.personal : undefined },
		{ value: 'shared' as const, label: t('taskViews.SHARED'), count: hasCounts ? counts.shared : undefined }
	];

	return (
		<PageLayout
			title={title}
			breadcrumb={breadcrumb}
			className="min-h-0 flex-1"
			mainHeaderSlot={
				<DashboardToolbar
					title={title}
					meta={hasCounts ? t('taskViews.SAVED_COUNT', { count: counts.all }) : undefined}
					isMetaLoading={isLoading}
					actions={
						<Button type="button" size="sm" className="h-8" onClick={createView} data-testid="views-new">
							<Plus className="size-4" aria-hidden="true" />
							{t('taskViews.NEW_VIEW')}
						</Button>
					}
					controls={
						<div className="flex w-full flex-wrap items-center gap-2">
							<ViewsSearchField value={query} onChange={setQuery} />
							<SegmentedControl<SavedViewsFilter>
								items={filterItems}
								value={filter}
								onValueChange={setFilter}
								ariaLabel={t('taskViews.FILTER_LABEL')}
							/>
						</div>
					}
				/>
			}
		>
			<div className="mx-auto flex w-full max-w-5xl flex-col gap-8 pb-8">
				<section aria-labelledby="built-in-views" className="flex flex-col gap-3">
					<ViewsSectionTitle>
						<span id="built-in-views">{t('taskViews.BUILT_IN')}</span>
					</ViewsSectionTitle>
					<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
						{TASK_BUILT_IN_VIEWS.map((key) => (
							<BuiltInViewCard key={key} viewKey={key} />
						))}
					</div>
				</section>

				<section aria-labelledby="saved-views" className="flex flex-col gap-3">
					<ViewsSectionTitle
						meta={
							isNarrowed && hasCounts
								? t('taskViews.SHOWING', { shown: shownViews.length, total: counts.all })
								: undefined
						}
					>
						<span id="saved-views">{t('taskViews.SAVED')}</span>
					</ViewsSectionTitle>
					<div className="overflow-hidden rounded-xl bg-card hairline-ring ring-border">
						{isError && <DashboardErrorNotice className="m-3" onRetry={() => void refetch()} />}
						{!isError && isLoading && <SavedViewsSkeleton />}
						{!isError && !isLoading && views.length === 0 && <SavedViewsEmpty onCreate={createView} />}
						{!isError && !isLoading && views.length > 0 && shownViews.length === 0 && (
							<SavedViewsNoMatch
								onClear={() => {
									setQuery('');
									setFilter('all');
								}}
							/>
						)}
						{!isError && !isLoading && shownViews.length > 0 && (
							<ul className="divide-y divide-border">
								{shownViews.map((view) => (
									<SavedViewRow
										key={view.id}
										view={view}
										isBusy={commands.busyId === view.id}
										onRename={commands.startRename}
										onToggleVisibility={(target) => void commands.toggleVisibility(target)}
										onDelete={commands.startDelete}
									/>
								))}
							</ul>
						)}
					</div>
				</section>
			</div>

			<SaveViewDialog
				open={commands.renaming !== null}
				mode="rename"
				initialName={commands.renaming?.name ?? ''}
				initialVisibility={commands.renaming?.visibility ?? ETaskViewVisibility.PERSONAL}
				onSubmit={(name) => commands.rename(name)}
				onClose={commands.stopRename}
			/>
			<DeleteViewDialog
				name={commands.deleting?.name ?? null}
				isBusy={commands.busyId !== null && commands.busyId === commands.deleting?.id}
				onConfirm={() => void commands.confirmDelete()}
				onClose={commands.stopDelete}
			/>
		</PageLayout>
	);
}
