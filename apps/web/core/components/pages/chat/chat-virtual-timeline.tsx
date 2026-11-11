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
import { useVirtualizer } from '@tanstack/react-virtual';
import { estimateTimelineItemSize, indexOfMessage, timelineItemKey } from '@/core/lib/utils/chat-virtual';
import type { ChatTimelineItem } from '@/core/lib/utils/chat-timeline';

/** What the pane asks of the virtual list: bring a message that is not drawn yet into view. */
export interface VirtualTimelineHandle {
	/** Scrolls the row of a message to the middle of the view; false when the rows do not hold it. */
	scrollToMessage: (messageId: string) => boolean;
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
	// eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual returns functions the React Compiler cannot memoize, so this component stays out of it, as the team tasks list does
	const virtualizer = useVirtualizer({
		count: items.length,
		getScrollElement: () => scrollRef.current,
		estimateSize: (index) => estimateTimelineItemSize(items[index]),
		getItemKey: (index) => timelineItemKey(items[index]),
		overscan: OVERSCAN,
		scrollMargin,
		// A conversation opens at its newest message.
		initialOffset: () => Number.MAX_SAFE_INTEGER
	});

	// Measured again whenever the rows or their height change: what stands above them changes with the rows (the
	// conversation's start, "Load older"), and a short conversation sits at the bottom of the view.
	const totalSize = virtualizer.getTotalSize();
	useLayoutEffect(() => {
		const top = container.current?.offsetTop ?? 0;
		setScrollMargin((current) => (current === top ? current : top));
	}, [items, totalSize]);

	// The scrolled element is the pane's, an ancestor: its ref is set after this list's first layout pass, so the list
	// draws once more when it is there, and finds it then.
	const [, redraw] = useReducer((count: number) => count + 1, 0);
	useEffect(() => {
		if (scrollRef.current) redraw();
	}, [scrollRef]);

	const scrollToMessage = useCallback(
		(messageId: string) => {
			const index = indexOfMessage(items, messageId);
			if (index === -1) return false;
			virtualizer.scrollToIndex(index, { align: 'center' });
			return true;
		},
		[items, virtualizer]
	);
	useImperativeHandle(handleRef, () => ({ scrollToMessage }), [scrollToMessage]);

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
