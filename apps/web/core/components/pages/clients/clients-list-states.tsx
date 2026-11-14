'use client';

import { useTranslations } from 'next-intl';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import { Notice } from '@/core/components/common/notice';
import { Skeleton } from '@/core/components/common/skeleton';
import { Button } from '@/core/components/duplicated-components/_button';
import { Archive, Building, Lock, Search } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import type { ClientScope } from '@/core/lib/utils/clients';
import { CLIENTS_TABLE_GRID, CLIENTS_TABLE_SURFACE, SKELETON_BAR } from './clients-table-grid';

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
		<div aria-hidden="true" className={CLIENTS_TABLE_SURFACE}>
			<div className={cn(CLIENTS_TABLE_GRID, 'h-9 pl-1 hairline-b border-border')}>
				<span className="px-2">
					<Skeleton className={cn('h-2.5 w-16 rounded-full', SKELETON_BAR)} />
				</span>
				<span className="px-2 max-lg:hidden">
					<Skeleton className={cn('h-2.5 w-16 rounded-full', SKELETON_BAR)} />
				</span>
				<span className="px-2">
					<Skeleton className={cn('h-2.5 w-14 rounded-full', SKELETON_BAR)} />
				</span>
				<span className="px-2 max-lg:hidden">
					<Skeleton className={cn('h-2.5 w-16 rounded-full', SKELETON_BAR)} />
				</span>
				<span />
			</div>
			<div className="hairline-divide-y divide-border">
				{rowKeys(SKELETON_ROWS).map((key, index) => (
					<div key={key} className={cn(CLIENTS_TABLE_GRID, 'min-h-12 pl-1')}>
						<span className="flex items-center gap-2.5 px-2">
							<Skeleton className={cn('size-7 rounded-[8px]', SKELETON_BAR)} />
							<Skeleton className={cn('h-3 rounded-full', SKELETON_BAR, nameBarWidthOf(index))} />
						</span>
						<span className="px-2 max-lg:hidden">
							<Skeleton className={cn('h-3 w-40 rounded-full', SKELETON_BAR)} />
						</span>
						<span className="px-2">
							<Skeleton className={cn('h-3 w-16 rounded-full', SKELETON_BAR)} />
						</span>
						<span className="px-2 max-lg:hidden">
							<Skeleton className={cn('h-3 w-14 rounded-full', SKELETON_BAR)} />
						</span>
						<span />
					</div>
				))}
			</div>
			<div className={cn(CLIENTS_TABLE_GRID, 'min-h-10 pl-1 hairline-t border-border')}>
				<span className="px-2">
					<Skeleton className={cn('h-2.5 w-14 rounded-full', SKELETON_BAR)} />
				</span>
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

/** A role without the right to read the clients is told so, instead of a connection problem it does not have. */
export function ClientsNoAccessState() {
	const t = useTranslations();
	return (
		<AnimatedEmptyState
			title={t('clients.NO_ACCESS_TITLE')}
			message={t('clients.NO_ACCESS_MESSAGE')}
			icon={<Lock />}
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
