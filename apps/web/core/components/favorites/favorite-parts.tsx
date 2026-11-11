'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { EntityTile } from '@/core/components/common/entity-tile';
import { Button } from '@/core/components/duplicated-components/_button';
import { FileText, MessageCircle, Spinner, Star, X } from '@/core/components/icons';
import { TaskIssueStatus } from '@/core/components/tasks/task-issue';
import { useChatActions } from '@/core/hooks/chat/use-chat-actions';
import type { FavoriteItemEntry } from '@/core/hooks/favorites/use-favorite-entries';
import { useFavoriteToggle } from '@/core/hooks/favorites/use-favorite-toggle';
import { useFavoritesQuery } from '@/core/hooks/favorites/use-favorites-query';
import { cn } from '@/core/lib/helpers';
import { FAVORITE_ENTITY_OF, type FavoriteKind, favoriteOf } from '@/core/lib/utils/favorites';
import type { EBaseEntityEnum } from '@/core/types/generics/enums/entity';
import type { TTask } from '@/core/types/schemas/task/task.schema';

const LEAD_ICON = 'size-4 shrink-0 text-muted-foreground';

/** The mark before a favourite's name: a project's tile, a task's type, a page's emoji, a conversation's bubble. */
export function FavoriteLead({ entry, size = 'sm' }: Readonly<{ entry: FavoriteItemEntry; size?: 'sm' | 'md' }>) {
	switch (entry.kind) {
		case 'project':
			return (
				<EntityTile
					name={entry.item.name}
					color={entry.item.color}
					imageUrl={entry.item.imageUrl}
					className={size === 'sm' ? 'size-4 rounded-[5px] text-[7px]' : 'size-5 rounded-md text-[8px]'}
				/>
			);
		case 'task':
			// The icon reads the task's type only, which the favourite's row carries
			return (
				<TaskIssueStatus
					showIssueLabels={false}
					className="shrink-0"
					task={{ issueType: entry.item.issueType } as TTask}
				/>
			);
		case 'document':
			if (entry.item.icon) {
				return (
					<span aria-hidden="true" className="flex size-4 shrink-0 items-center justify-center text-[13px]">
						{entry.item.icon}
					</span>
				);
			}
			return <FileText aria-hidden="true" className={LEAD_ICON} />;
		case 'chat':
			return <MessageCircle aria-hidden="true" className={LEAD_ICON} />;
	}
}

interface FavoriteRemoveButtonProps {
	kind: FavoriteKind;
	/** The starred item's id. */
	id: string;
	/** What the button says to a screen reader, with the item's name when it has one. */
	label: string;
	className?: string;
	/** `star` on the Favorites page (a filled star that empties), `cross` in the sidebar (shown on the row's hover). */
	look: 'star' | 'cross';
}

function RemoveButton({
	label,
	className,
	look,
	isPending,
	onRemove
}: Readonly<Omit<FavoriteRemoveButtonProps, 'kind' | 'id'> & { isPending: boolean; onRemove: () => void }>) {
	if (isPending) {
		return <Spinner aria-hidden="true" className="size-3.5 shrink-0 animate-spin text-muted-foreground" />;
	}
	return (
		<button type="button" aria-label={label} title={label} onClick={onRemove} className={className}>
			{look === 'star' ? <Star className="size-4 fill-current text-amber-500" /> : <X className="size-3.5" />}
		</button>
	);
}

function PlatformFavoriteRemoveButton({
	kind,
	id,
	...props
}: Readonly<FavoriteRemoveButtonProps & { kind: Exclude<FavoriteKind, 'chat'> }>) {
	const t = useTranslations();
	const { isPending, toggleFavorite } = useFavoriteToggle(FAVORITE_ENTITY_OF[kind]);
	const remove = () => {
		toggleFavorite(id).catch(() => toast.error(t('favorites.UPDATE_FAILED')));
	};
	return <RemoveButton {...props} isPending={isPending(id)} onRemove={remove} />;
}

function ChatFavoriteRemoveButton({ id, ...props }: Readonly<FavoriteRemoveButtonProps>) {
	const t = useTranslations();
	const { setMemberState } = useChatActions();
	const [isPending, setIsPending] = useState(false);
	const remove = () => {
		setIsPending(true);
		setMemberState(id, { isFavorite: false })
			.catch(() => toast.error(t('favorites.UPDATE_FAILED')))
			.finally(() => setIsPending(false));
	};
	return <RemoveButton {...props} isPending={isPending} onRemove={remove} />;
}

/**
 * Removes a favourite from the sidebar or the Favorites page. A project, task or page leaves the platform's
 * favourites; a conversation loses its membership's favourite flag, as the chat's own star does.
 */
export function FavoriteRemoveButton(props: Readonly<FavoriteRemoveButtonProps>) {
	if (props.kind === 'chat') {
		return <ChatFavoriteRemoveButton {...props} />;
	}
	return <PlatformFavoriteRemoveButton {...props} kind={props.kind} />;
}

/**
 * The star of an item's own page: filled while the item is a favourite, a click adds or removes it. Its name stays
 * "Favorite" and `aria-pressed` tells the state, as the chat's star does; the hover title says what a click does.
 */
export function FavoriteStarButton({
	entity,
	id,
	className
}: Readonly<{ entity: EBaseEntityEnum; id: string; className?: string }>) {
	const t = useTranslations();
	const { isFavorite, isPending, toggleFavorite } = useFavoriteToggle(entity);
	const isOn = isFavorite(id);
	const toggle = () => {
		toggleFavorite(id).catch(() => toast.error(t('favorites.UPDATE_FAILED')));
	};
	return (
		<Button
			type="button"
			variant="outline"
			size="icon"
			onClick={toggle}
			disabled={isPending(id)}
			aria-pressed={isOn}
			aria-label={t('favorites.FAVORITE')}
			title={isOn ? t('favorites.REMOVE') : t('favorites.ADD')}
			className={className}
		>
			<Star className={cn(isOn && 'fill-current text-amber-500')} />
		</Button>
	);
}

/** A filled star after an item's name while it is one of the person's favourites; nothing otherwise. */
export function FavoriteMark({ entity, id }: Readonly<{ entity: EBaseEntityEnum; id: string }>) {
	const t = useTranslations();
	const { currentEmployeeFavorites } = useFavoritesQuery();
	if (!favoriteOf(currentEmployeeFavorites, entity, id)) {
		return null;
	}
	const label = t('favorites.FAVORITE');
	return (
		<span title={label} className="inline-flex shrink-0 items-center">
			<Star aria-hidden="true" className="size-3.5 fill-current text-amber-500" />
			<span className="sr-only">{label}</span>
		</span>
	);
}

/** The sidebar's remove cross: shown on the row's hover and on keyboard focus, like the project rows' actions. */
export const SIDEBAR_FAVORITE_REMOVE = cn(
	'flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground outline-none',
	'transition-[color,background-color] hover:bg-foreground/5 hover:text-foreground',
	'focus-visible:ring-[3px] focus-visible:ring-ring/25'
);
