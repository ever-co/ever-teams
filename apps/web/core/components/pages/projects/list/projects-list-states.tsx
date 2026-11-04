'use client';

import { useTranslations } from 'next-intl';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import { Skeleton } from '@/core/components/common/skeleton';
import { Button } from '@/core/components/duplicated-components/_button';
import { Archive, Folder, RotateLeft, Search, X } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import type { ProjectScope, ProjectsView } from '@/core/lib/utils/project-list';

const SKELETON_BAR = 'bg-foreground/[0.06]';

export const PROJECTS_TOOLBAR_SEPARATOR = 'h-4 w-px shrink-0 bg-border max-sm:hidden';

const SKELETON_ROWS = 7;

const SKELETON_CARDS = 6;

function nameBarWidthOf(index: number) {
	const isEven = index % 2 === 0;
	if (isEven) {
		return 'w-44';
	}
	return 'w-32';
}

function rowKeys(count: number) {
	return Array.from({ length: count }, (_, index) => `skeleton-${index}`);
}

function ListSkeleton() {
	return (
		<div className="rounded-xl bg-card hairline-ring ring-border shadow-sm shadow-black/6.5">
			<div className="flex h-9 items-center gap-6 hairline-b border-border px-3">
				<Skeleton className={cn('h-2.5 w-20', SKELETON_BAR)} />
				<Skeleton className={cn('ml-auto h-2.5 w-16 max-lg:hidden', SKELETON_BAR)} />
				<Skeleton className={cn('h-2.5 w-16 max-lg:hidden', SKELETON_BAR)} />
				<Skeleton className={cn('h-2.5 w-24 max-lg:hidden', SKELETON_BAR)} />
			</div>
			<div className="hairline-divide-y divide-border">
				{rowKeys(SKELETON_ROWS).map((key, index) => (
					<div key={key} className="flex h-13 items-center gap-3 px-3">
						<Skeleton className={cn('size-4 rounded-[4px]', SKELETON_BAR)} />
						<Skeleton className={cn('size-8 rounded-[9px]', SKELETON_BAR)} />
						<div className="flex flex-col gap-1.5">
							<Skeleton className={cn('h-3', SKELETON_BAR, nameBarWidthOf(index))} />
							<Skeleton className={cn('h-2 w-20', SKELETON_BAR)} />
						</div>
						<Skeleton className={cn('ml-auto h-6 w-24 rounded-md max-lg:hidden', SKELETON_BAR)} />
						<Skeleton className={cn('h-3 w-16 max-lg:hidden', SKELETON_BAR)} />
						<Skeleton className={cn('h-6 w-14 rounded-full max-lg:hidden', SKELETON_BAR)} />
						<Skeleton className={cn('h-3 w-28 max-lg:hidden', SKELETON_BAR)} />
					</div>
				))}
			</div>
		</div>
	);
}

function GridSkeleton() {
	return (
		<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
			{rowKeys(SKELETON_CARDS).map((key) => (
				<div
					key={key}
					className="flex flex-col gap-4 rounded-xl bg-card p-4 hairline-ring ring-border shadow-sm shadow-black/6.5"
				>
					<div className="flex items-center gap-3">
						<Skeleton className={cn('size-10 rounded-[11px]', SKELETON_BAR)} />
						<div className="flex flex-col gap-1.5">
							<Skeleton className={cn('h-2.5 w-16', SKELETON_BAR)} />
							<Skeleton className={cn('h-3 w-36', SKELETON_BAR)} />
						</div>
					</div>
					<div className="flex gap-2">
						<Skeleton className={cn('h-6 w-24 rounded-md', SKELETON_BAR)} />
						<Skeleton className={cn('h-6 w-28 rounded-md', SKELETON_BAR)} />
					</div>
					<Skeleton className={cn('h-6 w-20', SKELETON_BAR)} />
					<div className="flex items-end gap-6 hairline-t border-dashed border-border pt-3">
						<Skeleton className={cn('h-6 w-16 rounded-full', SKELETON_BAR)} />
						<Skeleton className={cn('h-3 w-20', SKELETON_BAR)} />
					</div>
				</div>
			))}
		</div>
	);
}

export function ProjectsCountSkeleton() {
	return <Skeleton aria-hidden="true" className={cn('h-2.5 w-16 self-center rounded-full', SKELETON_BAR)} />;
}

export function ProjectsListSkeleton({ view }: Readonly<{ view: ProjectsView }>) {
	if (view === 'GRID') {
		return <GridSkeleton />;
	}
	return <ListSkeleton />;
}

export function ProjectsEmptyState({
	scope,
	isNarrowed,
	onClearFilters,
	onCreate
}: Readonly<{ scope: ProjectScope; isNarrowed: boolean; onClearFilters: () => void; onCreate: () => void }>) {
	const t = useTranslations();
	if (isNarrowed) {
		return (
			<AnimatedEmptyState
				title={t('pages.projects.list.NO_MATCH_TITLE')}
				message={t('pages.projects.list.NO_MATCH_MESSAGE')}
				icon={<Search />}
				actionLabel={t('common.CLEAR_FILTERS')}
				actionVariant="outline"
				onAction={onClearFilters}
				minHeight="420px"
			/>
		);
	}
	if (scope === 'archived') {
		return (
			<AnimatedEmptyState
				title={t('pages.projects.list.EMPTY_ARCHIVED_TITLE')}
				message={t('pages.projects.list.EMPTY_ARCHIVED_MESSAGE')}
				icon={<Archive />}
				minHeight="420px"
			/>
		);
	}
	return (
		<AnimatedEmptyState
			title={t('pages.projects.list.EMPTY_TITLE')}
			message={t('pages.projects.list.EMPTY_MESSAGE')}
			icon={<Folder />}
			actionLabel={t('pages.projects.list.CREATE_PROJECT')}
			onAction={onCreate}
			minHeight="420px"
		/>
	);
}

export function ProjectsErrorState({ onRetry }: Readonly<{ onRetry: () => void }>) {
	const t = useTranslations();
	return (
		<AnimatedEmptyState
			title={t('pages.projects.list.ERROR_TITLE')}
			message={t('pages.projects.list.ERROR_MESSAGE')}
			actionLabel={t('pages.unauthorized.TRY_AGAIN')}
			actionVariant="outline"
			onAction={onRetry}
			minHeight="420px"
		/>
	);
}

export function ProjectsSelectionBar({
	count,
	scope,
	onArchive,
	onRestore,
	onClear
}: Readonly<{
	count: number;
	scope: ProjectScope;
	onArchive: () => void;
	onRestore: () => void;
	onClear: () => void;
}>) {
	const t = useTranslations();
	const isArchivedScope = scope === 'archived';
	return (
		<div className="pointer-events-none sticky bottom-4 z-10 mt-4 flex justify-center">
			<div
				role="toolbar"
				aria-label={t('pages.projects.list.SELECTED', { count })}
				className="surface-raised pointer-events-auto flex h-11 items-center gap-1 rounded-full py-1 pr-1.5 pl-4"
			>
				<span className="pr-2 text-[13px] font-medium tabular-nums text-foreground">
					{t('pages.projects.list.SELECTED', { count })}
				</span>
				<span className="h-4 w-px bg-border" />
				{isArchivedScope && (
					<Button variant="ghost" size="default" onClick={onRestore}>
						<RotateLeft />
						{t('common.RESTORE')}
					</Button>
				)}
				{!isArchivedScope && (
					<Button variant="ghost" size="default" onClick={onArchive}>
						<Archive />
						{t('common.ARCHIVE')}
					</Button>
				)}
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={onClear}
					aria-label={t('pages.projects.list.CLEAR_SELECTION')}
					className="text-muted-foreground"
				>
					<X />
				</Button>
			</div>
		</div>
	);
}
