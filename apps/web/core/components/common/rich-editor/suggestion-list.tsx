'use client';

import {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
	type ForwardedRef,
	type ReactElement
} from 'react';
import type { IconComponent } from '@/core/components/icons';
import { PersonAvatar } from '@/core/components/teams/people-avatars';
import { MENU_SURFACE } from '@/core/components/common/menu-recipes';
import { cn } from '@/core/lib/helpers';

/**
 * The list behind "/" (blocks) and "@" (people). Keys reach it from the editor through the imperative handle, so
 * the caret stays in the text and typing keeps filtering; a press happens on mousedown for the same reason.
 */

export type SuggestionEntry = {
	id: string;
	title: string;
	hint?: string;
	icon?: IconComponent;
	person?: { name: string; imageUrl: string | null | undefined };
};

export type SuggestionListProps<I extends SuggestionEntry> = {
	items: I[];
	command: (item: I) => void;
	loading?: boolean;
	emptyLabel: string;
	loadingLabel: string;
	ariaLabel: string;
};

export type SuggestionListHandle = {
	/** True when the key belonged to the list. */
	onKeyDown: (event: KeyboardEvent) => boolean;
};

const ROW =
	'flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] text-foreground outline-none';

const ICON_TILE =
	'keycap-3d flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground [&_svg]:size-4';

function nextIndex(index: number, count: number) {
	return (index + 1) % count;
}

function previousIndex(index: number, count: number) {
	return (index - 1 + count) % count;
}

function isSubmitShortcut(event: KeyboardEvent) {
	return event.metaKey || event.ctrlKey;
}

function EntryLeading({ entry }: { entry: SuggestionEntry }) {
	if (entry.person) {
		const person = { id: entry.id, name: entry.person.name, imageUrl: entry.person.imageUrl };
		return <PersonAvatar person={person} className="ring-0" />;
	}
	const Icon = entry.icon;
	if (!Icon) {
		return null;
	}
	return (
		<span className={ICON_TILE} aria-hidden="true">
			<Icon />
		</span>
	);
}

function EmptyRow({
	loading,
	emptyLabel,
	loadingLabel
}: {
	loading?: boolean;
	emptyLabel: string;
	loadingLabel: string;
}) {
	if (loading) {
		return <p className="px-2 py-1.5 text-xs text-muted-foreground">{loadingLabel}</p>;
	}
	return <p className="px-2 py-1.5 text-xs text-muted-foreground">{emptyLabel}</p>;
}

function SuggestionListInner<I extends SuggestionEntry>(
	{ items, command, loading, emptyLabel, loadingLabel, ariaLabel }: SuggestionListProps<I>,
	ref: ForwardedRef<SuggestionListHandle>
) {
	const [active, setActive] = useState(0);
	const [previousItems, setPreviousItems] = useState(items);
	const listRef = useRef<HTMLDivElement>(null);
	if (items !== previousItems) {
		setPreviousItems(items);
		setActive(0);
	}
	const hasItems = items.length > 0;
	const lastIndex = Math.max(items.length - 1, 0);
	const index = Math.min(active, lastIndex);

	useEffect(() => {
		const selected = listRef.current?.querySelector('[aria-selected="true"]');
		selected?.scrollIntoView({ block: 'nearest' });
	}, [index]);

	useImperativeHandle(
		ref,
		() => ({
			onKeyDown(event) {
				if (!hasItems) {
					return false;
				}
				if (event.key === 'ArrowDown') {
					setActive((current) => nextIndex(current, items.length));
					return true;
				}
				if (event.key === 'ArrowUp') {
					setActive((current) => previousIndex(current, items.length));
					return true;
				}
				const isPick = event.key === 'Enter' || event.key === 'Tab';
				if (!isPick) {
					return false;
				}
				if (isSubmitShortcut(event)) {
					return false;
				}
				command(items[index]);
				return true;
			}
		}),
		[command, hasItems, index, items]
	);

	return (
		<div
			ref={listRef}
			role="listbox"
			aria-label={ariaLabel}
			className={cn(MENU_SURFACE, 'max-h-72 w-72 max-w-[calc(100vw-1rem)] overflow-y-auto')}
		>
			{!hasItems && <EmptyRow loading={loading} emptyLabel={emptyLabel} loadingLabel={loadingLabel} />}
			{items.map((item, itemIndex) => {
				const isActive = itemIndex === index;
				return (
					<button
						key={item.id}
						type="button"
						role="option"
						aria-selected={isActive}
						onMouseDown={(event) => {
							event.preventDefault();
							command(item);
						}}
						onMouseEnter={() => setActive(itemIndex)}
						className={cn(ROW, isActive && 'bg-foreground/5')}
					>
						<EntryLeading entry={item} />
						<span className="min-w-0 flex-1">
							<span className="block truncate">{item.title}</span>
							{item.hint && (
								<span className="block truncate text-xs text-muted-foreground">{item.hint}</span>
							)}
						</span>
					</button>
				);
			})}
		</div>
	);
}

export const SuggestionList = forwardRef(SuggestionListInner) as <I extends SuggestionEntry>(
	props: SuggestionListProps<I> & { ref?: ForwardedRef<SuggestionListHandle> }
) => ReactElement;
