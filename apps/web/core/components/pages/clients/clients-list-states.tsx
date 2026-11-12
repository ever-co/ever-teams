'use client';

import { useTranslations } from 'next-intl';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import { Notice } from '@/core/components/common/notice';
import { Skeleton } from '@/core/components/common/skeleton';
import { Button } from '@/core/components/duplicated-components/_button';
import { Archive, Building, Search } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import type { ClientScope } from '@/core/lib/utils/clients';

const SKELETON_BAR = 'bg-foreground/[0.06]';

const SKELETON_ROWS = 6;

function rowKeys(count: number) {
	return Array.from({ length: count }, (_, index) => `skeleton-${index}`);
}

function nameBarWidthOf(index: number) {
	const isEven = index % 2 === 0;
	if (isEven) {
		return 'w-40';
	}
	return 'w-28';
}

export function ClientsCountSkeleton() {
	return <Skeleton aria-hidden="true" className={cn('h-2.5 w-16 self-center rounded-full', SKELETON_BAR)} />;
}

export function ClientsListSkeleton() {
	return (
		<div aria-hidden="true" className="rounded-xl bg-card hairline-ring ring-border shadow-sm shadow-black/6.5">
			<div className="flex h-9 items-center gap-6 hairline-b border-border px-3">
				<Skeleton className={cn('h-2.5 w-20', SKELETON_BAR)} />
				<Skeleton className={cn('ml-auto h-2.5 w-16 max-lg:hidden', SKELETON_BAR)} />
				<Skeleton className={cn('h-2.5 w-16 max-lg:hidden', SKELETON_BAR)} />
				<Skeleton className={cn('h-2.5 w-16', SKELETON_BAR)} />
			</div>
			<div className="hairline-divide-y divide-border">
				{rowKeys(SKELETON_ROWS).map((key, index) => (
					<div key={key} className="flex h-13 items-center gap-3 px-3">
						<Skeleton className={cn('size-8 rounded-[9px]', SKELETON_BAR)} />
						<Skeleton className={cn('h-3', SKELETON_BAR, nameBarWidthOf(index))} />
						<Skeleton className={cn('ml-auto h-3 w-36 max-lg:hidden', SKELETON_BAR)} />
						<Skeleton className={cn('h-3 w-24 max-lg:hidden', SKELETON_BAR)} />
						<Skeleton className={cn('h-3 w-16', SKELETON_BAR)} />
					</div>
				))}
			</div>
		</div>
	);
}

export function ClientsEmptyState({
	scope,
	isSearching,
	canCreate,
	onClearSearch,
	onCreate
}: Readonly<{
	scope: ClientScope;
	isSearching: boolean;
	canCreate: boolean;
	onClearSearch: () => void;
	onCreate: () => void;
}>) {
	const t = useTranslations();
	if (isSearching) {
		return (
			<AnimatedEmptyState
				title={t('clients.NO_MATCH_TITLE')}
				message={t('clients.NO_MATCH_MESSAGE')}
				icon={<Search />}
				actionLabel={t('clients.CLEAR_SEARCH')}
				actionVariant="outline"
				onAction={onClearSearch}
				minHeight="420px"
			/>
		);
	}
	if (scope === 'archived') {
		return (
			<AnimatedEmptyState
				title={t('clients.EMPTY_ARCHIVED_TITLE')}
				message={t('clients.EMPTY_ARCHIVED_MESSAGE')}
				icon={<Archive />}
				minHeight="420px"
			/>
		);
	}
	if (!canCreate) {
		return (
			<AnimatedEmptyState
				title={t('clients.EMPTY_TITLE')}
				message={t('clients.EMPTY_MESSAGE_READ_ONLY')}
				icon={<Building />}
				minHeight="420px"
			/>
		);
	}
	return (
		<AnimatedEmptyState
			title={t('clients.EMPTY_TITLE')}
			message={t('clients.EMPTY_MESSAGE')}
			icon={<Building />}
			actionLabel={t('clients.NEW_CLIENT')}
			onAction={onCreate}
			minHeight="420px"
		/>
	);
}

export function ClientsErrorState({ onRetry }: Readonly<{ onRetry: () => void }>) {
	const t = useTranslations();
	return (
		<AnimatedEmptyState
			title={t('clients.ERROR_TITLE')}
			message={t('clients.ERROR_MESSAGE')}
			actionLabel={t('pages.unauthorized.TRY_AGAIN')}
			actionVariant="outline"
			onAction={onRetry}
			minHeight="420px"
		/>
	);
}

/** The clients are listed while their projects could not be read: the counts stay unwritten until a read succeeds. */
export function ProjectCountsNotice({ onRetry }: Readonly<{ onRetry: () => void }>) {
	const t = useTranslations();
	return (
		<Notice
			tone="error"
			title={t('pages.projects.list.ERROR_TITLE')}
			description={t('pages.projects.list.ERROR_MESSAGE')}
			actions={
				<Button type="button" variant="outline" size="sm" onClick={onRetry}>
					{t('pages.unauthorized.TRY_AGAIN')}
				</Button>
			}
			className="mb-3"
		/>
	);
}
