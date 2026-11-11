'use client';

import {
	type ReactNode,
	type Ref,
	type RefObject,
	useCallback,
	useEffect,
	useImperativeHandle,
	useLayoutEffect,
	useReducer,
	useRef,
	useState
} from 'react';
import { useVirtualizer, type Virtualizer } from '@tanstack/react-virtual';
import { estimateTimelineItemSize, indexOfMessage, timelineItemKey } from '@/core/lib/utils/chat-virtual';
import type { ChatTimelineItem } from '@/core/lib/utils/chat-timeline';

/** What the pane asks of the virtual list: bring a message that is not drawn yet into view. */
/** The row at the top of the view and how far its top is from the view's: what an older page must not move. */
export interface VirtualTimelineAnchor {
	key: string;
	delta: number;
}

export interface VirtualTimelineHandle {
	/** Scrolls the row of a message to the middle of the view; false when the rows do not hold it. */
	scrollToMessage: (messageId: string) => boolean;
	/** The row the reader is at, before an older page comes in above it. */
	anchor: () => VirtualTimelineAnchor | null;
	/** Puts that row back where it was once the page is in (its new place, measured rows included); false without it. */
	restore: (anchor: VirtualTimelineAnchor) => boolean;
}

/** Rows drawn beyond the view on each side: a quick scroll or a key press shows drawn rows, not blank space. */
const OVERSCAN = 12;

/**
 * The timeline's rows, only those near the reader's place drawn (behind `NEXT_PUBLIC_CHAT_VIRTUAL_LIST_ENABLED`). The
 * scroll stays the pane's own element: following new messages at the bottom, keeping the place when an older page
 * comes in above, and the "Jump to latest" pill work as they do without it. A row is measured once drawn and keeps
 * its height by its key (a message id), so an older page coming in above never makes the rows below jump.
 */
export function VirtualTimeline({
	items,
	scrollRef,
	renderItem,
	handleRef
}: Readonly<{
	items: readonly ChatTimelineItem[];
	scrollRef: RefObject<HTMLDivElement | null>;
	renderItem: (item: ChatTimelineItem) => ReactNode;
	handleRef?: Ref<VirtualTimelineHandle>;
}>) {
	const container = useRef<HTMLDivElement | null>(null);
	// Where the rows start inside the scrolled element (below the conversation's start, or pushed down while short).
	const [scrollMargin, setScrollMargin] = useState(0);
	// The scrolled element is the pane's, an ancestor: its ref is set after this list's first layout pass. The list is
	// switched on once it is there, so its first place is worked out from the pane as it is laid out (the bottom, or 0
	// while the conversation fits), never guessed before.
	const [ready, markReady] = useReducer(() => true, false);
	// The list itself, for its first place: the height of its rows, known only once it is on.
	const virtualRef = useRef<Virtualizer<HTMLDivElement, Element> | null>(null);
	useEffect(() => {
		if (scrollRef.current) markReady();
	}, [scrollRef]);
	// eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual returns functions the React Compiler cannot memoize, so this component stays out of it, as the team tasks list does
	const virtualizer = useVirtualizer({
		count: items.length,
		enabled: ready,
		getScrollElement: () => scrollRef.current,
		estimateSize: (index) => estimateTimelineItemSize(items[index]),
		getItemKey: (index) => timelineItemKey(items[index]),
		overscan: OVERSCAN,
		scrollMargin,
		// A conversation opens at its newest message: the bottom of the pane as it is laid out (0 while it fits), never
		// past it, so a short conversation that cannot scroll draws all its rows.
		initialOffset: () => {
			const element = scrollRef.current;
			const list = virtualRef.current;
			if (!element || !list) return 0;
			return Math.max(0, list.getTotalSize() + (container.current?.offsetTop ?? 0) - element.clientHeight);
		},
		// A row measured as it mounts would re-render the list inside React's commit (React 19 warns): the next frame does.
		useFlushSync: false
	});
	virtualRef.current = virtualizer;

	// Measured again whenever the rows or their height change: what stands above them changes with the rows (the
	// conversation's start, "Load older"), and a short conversation sits at the bottom of the view.
	const totalSize = virtualizer.getTotalSize();
	const measureMargin = useCallback(() => {
		const top = container.current?.offsetTop ?? 0;
		setScrollMargin((current) => (current === top ? current : top));
	}, []);
	useLayoutEffect(measureMargin, [items, totalSize, measureMargin]);
	// A short conversation sits at the bottom of the view: the pane growing or shrinking (the composer taking a line,
	// the window resized) moves the rows without changing them.
	useEffect(() => {
		const element = scrollRef.current;
		if (!element || typeof ResizeObserver === 'undefined') return;
		const observer = new ResizeObserver(measureMargin);
		observer.observe(element);
		return () => observer.disconnect();
	}, [measureMargin, scrollRef]);

	const scrollToMessage = useCallback(
		(messageId: string) => {
			const index = indexOfMessage(items, messageId);
			if (index === -1) return false;
			virtualizer.scrollToIndex(index, { align: 'center' });
			return true;
		},
		[items, virtualizer]
	);
	// A message, never a day divider: an older page of the same day keeps that divider above its own messages.
	const anchor = useCallback((): VirtualTimelineAnchor | null => {
		const offset = scrollRef.current?.scrollTop ?? 0;
		const row = virtualizer
			.getVirtualItems()
			.find((item) => item.end > offset && items[item.index]?.type === 'message');
		return row ? { key: String(row.key), delta: row.start - offset } : null;
	}, [items, scrollRef, virtualizer]);
	const restore = useCallback(
		(held: VirtualTimelineAnchor) => {
			const element = scrollRef.current;
			// The measurements of the rows as they are now (the total works them out first: the older page included).
			virtualizer.getTotalSize();
			const row = virtualizer.measurementsCache.find((item) => String(item.key) === held.key);
			if (!element || !row) return false;
			element.scrollTop = row.start - held.delta;
			return true;
		},
		[scrollRef, virtualizer]
	);
	useImperativeHandle(handleRef, () => ({ scrollToMessage, anchor, restore }), [anchor, restore, scrollToMessage]);

	const rows = virtualizer.getVirtualItems();
	return (
		<div ref={container} className="relative w-full" style={{ height: totalSize }} data-virtual-timeline="">
			{rows.map((row) => (
				<div
					key={row.key}
					ref={virtualizer.measureElement}
					data-index={row.index}
					className="absolute start-0 top-0 w-full"
					style={{ transform: `translateY(${row.start - scrollMargin}px)` }}
				>
					{renderItem(items[row.index])}
				</div>
			))}
		</div>
	);
}
