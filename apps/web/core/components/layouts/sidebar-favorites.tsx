'use client';

import { type ReactNode, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
	FavoriteLead,
	FavoriteRemoveButton,
	SIDEBAR_FAVORITE_REMOVE
} from '@/core/components/favorites/favorite-parts';
import { useFavoriteEntries } from '@/core/hooks/favorites/use-favorite-entries';
import { FAVORITE_KIND_LABEL_KEYS, FAVORITES_PATH } from '@/core/lib/utils/favorites';

interface SidebarFavoriteRow {
	title: string;
	url: string;
	component?: ReactNode;
	icon?: ReactNode;
	trailing?: ReactNode;
	actions?: ReactNode;
}

/** A kind's caption inside the Favorites group: a label, not a link. */
function FavoriteCaption({ label }: Readonly<{ label: string }>) {
	return (
		<span className="flex h-6 items-end px-2 pb-0.5 text-[11px] font-medium text-muted-foreground/80">{label}</span>
	);
}

/** What the group shows once the person's favourites have arrived and there are none. */
function NoFavorites({ label }: Readonly<{ label: string }>) {
	return <span className="flex h-8 items-center px-2 text-[13px] text-muted-foreground">{label}</span>;
}

function TaskNumber({ value }: Readonly<{ value: string }>) {
	return <span className="text-xs tabular-nums text-muted-foreground/70">{value}</span>;
}

/**
 * The rows of the sidebar's Favorites group (#5017): the person's favourites by kind (projects, tasks, pages,
 * conversations), each with its mark and a cross to remove it, then the row to the Favorites page. An archived
 * project, and a favourite whose item is gone, are listed on that page only.
 */
export function useSidebarFavoriteItems(): SidebarFavoriteRow[] {
	const t = useTranslations();
	const { groups, isEmpty } = useFavoriteEntries({ loadsProjects: false });

	return useMemo(() => {
		const rows: SidebarFavoriteRow[] = [];
		for (const group of groups) {
			const entries = group.entries.filter((entry) => entry.kind !== 'project' || !entry.item.isArchived);
			if (entries.length === 0) {
				continue;
			}
			const caption = t(FAVORITE_KIND_LABEL_KEYS[group.kind]);
			rows.push({ title: caption, url: '#', component: <FavoriteCaption label={caption} /> });
			for (const entry of entries) {
				const taskNumber = entry.kind === 'task' ? (entry.item.taskNumber ?? entry.item.number) : null;
				rows.push({
					title: entry.title,
					url: entry.href,
					icon: <FavoriteLead entry={entry} />,
					trailing: taskNumber ? <TaskNumber value={`#${taskNumber}`} /> : undefined,
					actions: (
						<FavoriteRemoveButton
							kind={entry.kind}
							id={entry.id}
							label={t('favorites.REMOVE_NAMED', { name: entry.title })}
							look="cross"
							className={SIDEBAR_FAVORITE_REMOVE}
						/>
					)
				});
			}
		}
		if (isEmpty) {
			const none = t('favorites.NONE');
			rows.push({ title: none, url: '#', component: <NoFavorites label={none} /> });
		}
		rows.push({ title: t('favorites.ALL'), url: FAVORITES_PATH });
		return rows;
	}, [groups, isEmpty, t]);
}
