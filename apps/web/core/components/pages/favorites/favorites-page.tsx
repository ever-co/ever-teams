'use client';

import Link from 'next/link';
import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import { FavoriteLead, FavoriteRemoveButton } from '@/core/components/favorites/favorite-parts';
import { Archive, Star } from '@/core/components/icons';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { LIST_SURFACE_CLASS } from '@/core/components/teams/list-surface';
import { type FavoriteItemEntry, useFavoriteEntries } from '@/core/hooks/favorites/use-favorite-entries';
import { cn } from '@/core/lib/helpers';
import { FAVORITE_KIND_LABEL_KEYS, type FavoriteGroup, type UnavailableFavorite } from '@/core/lib/utils/favorites';

const ROW = 'flex min-h-11 items-center gap-3 px-3';
const ROW_SPLIT = 'hairline-t border-border';
const REMOVE =
	'flex size-7 shrink-0 items-center justify-center rounded-md outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-[3px] focus-visible:ring-ring/25';

function FavoriteRow({ entry, isFirst }: Readonly<{ entry: FavoriteItemEntry; isFirst: boolean }>) {
	const t = useTranslations();
	const taskNumber = entry.kind === 'task' ? (entry.item.taskNumber ?? entry.item.number) : null;
	const isArchived = entry.kind === 'project' && Boolean(entry.item.isArchived);
	return (
		<li className={cn(ROW, !isFirst && ROW_SPLIT)}>
			<Link
				href={entry.href}
				className="flex min-w-0 flex-1 items-center gap-3 rounded-md py-2 text-sm text-foreground outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/25"
			>
				<FavoriteLead entry={entry} size="md" />
				<span className="min-w-0 truncate">{entry.title}</span>
				{taskNumber && (
					<span className="shrink-0 text-xs tabular-nums text-muted-foreground">#{taskNumber}</span>
				)}
				{isArchived && (
					<span className="inline-flex h-5 shrink-0 items-center gap-1 rounded-md bg-foreground/5 px-1.5 text-xs text-muted-foreground [&_svg]:size-3">
						<Archive />
						{t('favorites.ARCHIVED')}
					</span>
				)}
			</Link>
			<FavoriteRemoveButton
				kind={entry.kind}
				id={entry.id}
				label={t('favorites.REMOVE_NAMED', { name: entry.title })}
				look="star"
				className={REMOVE}
			/>
		</li>
	);
}

function FavoriteSection({ group }: Readonly<{ group: FavoriteGroup<FavoriteItemEntry> }>) {
	const t = useTranslations();
	const headingId = useId();
	return (
		<section aria-labelledby={headingId} className="flex flex-col gap-2">
			<h2 id={headingId} className="flex items-center gap-2 px-1 text-xs font-medium text-muted-foreground">
				{t(FAVORITE_KIND_LABEL_KEYS[group.kind])}
				<span className="tabular-nums text-muted-foreground/70">{group.entries.length}</span>
			</h2>
			<ul className={LIST_SURFACE_CLASS}>
				{group.entries.map((entry, index) => (
					<FavoriteRow key={entry.id} entry={entry} isFirst={index === 0} />
				))}
			</ul>
		</section>
	);
}

/** Favourites whose item is gone: deleted, or out of the person's reach. Each can be removed. */
function UnavailableSection({ favorites }: Readonly<{ favorites: ReadonlyArray<UnavailableFavorite> }>) {
	const t = useTranslations();
	const headingId = useId();
	return (
		<section aria-labelledby={headingId} className="flex flex-col gap-2">
			<div className="flex flex-col gap-0.5 px-1">
				<h2 id={headingId} className="text-xs font-medium text-muted-foreground">
					{t('favorites.UNAVAILABLE')}
				</h2>
				<p className="text-xs text-muted-foreground/80">{t('favorites.UNAVAILABLE_HINT')}</p>
			</div>
			<ul className={LIST_SURFACE_CLASS}>
				{favorites.map((favorite, index) => {
					const label = t('favorites.UNAVAILABLE_ITEM', { kind: favorite.kind });
					return (
						<li key={`${favorite.kind}-${favorite.id}`} className={cn(ROW, index > 0 && ROW_SPLIT)}>
							<span className="min-w-0 flex-1 truncate py-2 text-sm text-muted-foreground">{label}</span>
							<FavoriteRemoveButton
								kind={favorite.kind}
								id={favorite.id}
								label={t('favorites.REMOVE')}
								look="star"
								className={REMOVE}
							/>
						</li>
					);
				})}
			</ul>
		</section>
	);
}

function FavoritesSkeleton() {
	return (
		<div aria-hidden="true" className="flex flex-col gap-2">
			<div className="h-4 w-24 animate-pulse rounded bg-foreground/[0.06]" />
			<div className={cn(LIST_SURFACE_CLASS, 'flex flex-col')}>
				{[0, 1, 2].map((row) => (
					<div key={row} className={cn(ROW, row > 0 && ROW_SPLIT)}>
						<div className="size-5 animate-pulse rounded-md bg-foreground/[0.06]" />
						<div className="h-3.5 w-48 animate-pulse rounded bg-foreground/[0.06]" />
					</div>
				))}
			</div>
		</div>
	);
}

/** The page while the person is not known yet: its column, its title's place and a list. */
export function FavoritesPageSkeleton() {
	return (
		<div aria-hidden="true" className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
			<div className="flex flex-col gap-2">
				<div className="h-6 w-36 animate-pulse rounded-md bg-foreground/[0.06]" />
				<div className="h-3.5 w-72 animate-pulse rounded bg-foreground/[0.04]" />
			</div>
			<FavoritesSkeleton />
		</div>
	);
}

/**
 * `/favorites` (#5017): every favourite of the person, by kind, each a link with its star to remove it. A favourite
 * whose item is gone is listed apart, to remove it; the sidebar's Favorites group shows the same favourites.
 */
export function FavoritesPage() {
	const t = useTranslations();
	const { groups, unavailable, isEmpty, isLoading } = useFavoriteEntries({ loadsProjects: true });

	return (
		<PageLayout title={t('favorites.TITLE')} className="min-h-0 flex-1">
			<div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
				<header className="flex flex-col gap-1">
					<h1 className="flex items-center gap-2 text-lg font-semibold text-foreground">
						<Star aria-hidden="true" className="size-5 text-muted-foreground" />
						{t('favorites.TITLE')}
					</h1>
					<p className="text-[13px] text-muted-foreground">{t('favorites.DESCRIPTION')}</p>
				</header>
				{isLoading && <FavoritesSkeleton />}
				{isEmpty && (
					<div className="py-10">
						<AnimatedEmptyState
							title={t('favorites.EMPTY_TITLE')}
							message={t('favorites.EMPTY_DESCRIPTION')}
						/>
					</div>
				)}
				{groups.map((group) => (
					<FavoriteSection key={group.kind} group={group} />
				))}
				{unavailable.length > 0 && <UnavailableSection favorites={unavailable} />}
			</div>
		</PageLayout>
	);
}
