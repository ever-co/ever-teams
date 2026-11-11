/** @jest-environment jsdom */

import React, { useCallback, useRef } from 'react';
import { act, render, screen } from '@testing-library/react';
import type { ChatTimelineItem } from '@/core/lib/utils/chat-timeline';
import type { IChatMessage } from '@/core/types/interfaces/common/chat';
import { VirtualTimeline, type VirtualTimelineHandle } from './chat-virtual-timeline';

const VIEW_HEIGHT = 600;
/** The height jsdom reports for a drawn row (its estimate differs: a measured row keeps this one). */
const ROW_HEIGHT = 50;

function message(index: number, body = `message ${index}`): IChatMessage {
	return {
		id: `m${index}`,
		conversationId: 'c1',
		kind: 'message',
		body,
		mentionsChannel: false,
		mentionsHere: false,
		alsoInConversation: false,
		replyCount: 0,
		createdAt: new Date(2026, 10, 11, 10, 0, index).toISOString()
	};
}

const rowsOf = (from: number, to: number, body?: (index: number) => string): ChatTimelineItem[] =>
	Array.from({ length: to - from }, (_, offset) => {
		const index = from + offset;
		return { type: 'message', message: message(index, body?.(index)), continues: true };
	});

/**
 * jsdom lays nothing out and scrolls nothing: the scrolled box gets a view of 600 px, a scroll position it keeps, a
 * scroll height of the list, and a `scrollTo` that moves it and says so, as a browser's does.
 */
function scrollable(element: HTMLDivElement) {
	let top = 0;
	Object.defineProperty(element, 'scrollTop', {
		configurable: true,
		get: () => top,
		set: (value: number) => {
			top = Math.max(0, value);
		}
	});
	Object.defineProperty(element, 'scrollHeight', {
		configurable: true,
		get: () =>
			Number.parseInt(element.querySelector<HTMLElement>('[data-virtual-timeline]')?.style.height ?? '0', 10)
	});
	element.scrollTo = ((options?: ScrollToOptions) => {
		if (typeof options?.top === 'number') top = Math.max(0, options.top);
		element.dispatchEvent(new Event('scroll'));
	}) as typeof element.scrollTo;
}

function Harness({ items, handle }: { items: ChatTimelineItem[]; handle?: React.Ref<VirtualTimelineHandle> }) {
	const scroll = useRef<HTMLDivElement | null>(null);
	const attach = useCallback((element: HTMLDivElement | null) => {
		if (element && scroll.current !== element) scrollable(element);
		scroll.current = element;
	}, []);
	return (
		<div ref={attach} data-testid="scroll" style={{ height: VIEW_HEIGHT, overflowY: 'auto' }}>
			<VirtualTimeline
				items={items}
				scrollRef={scroll}
				handleRef={handle}
				renderItem={(item) =>
					item.type === 'message' ? <p data-message-id={item.message.id}>{item.message.body}</p> : null
				}
			/>
		</div>
	);
}

const originalRect = HTMLElement.prototype.getBoundingClientRect;
const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
const heightOf = (element: HTMLElement) =>
	element.dataset.testid === 'scroll' ? VIEW_HEIGHT : element.dataset.index !== undefined ? ROW_HEIGHT : 0;

beforeAll(() => {
	HTMLElement.prototype.getBoundingClientRect = function rect(this: HTMLElement) {
		const height = heightOf(this);
		return {
			x: 0,
			y: 0,
			top: 0,
			left: 0,
			right: 800,
			bottom: height,
			width: 800,
			height,
			toJSON: () => ({})
		} as DOMRect;
	};
	Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
		configurable: true,
		get(this: HTMLElement) {
			return heightOf(this);
		}
	});
});

afterAll(() => {
	HTMLElement.prototype.getBoundingClientRect = originalRect;
	if (originalOffsetHeight) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight);
});

/** Where a drawn message's row starts in the list (its translateY). */
function startOf(messageId: string): number {
	const row = document.querySelector<HTMLElement>(`[data-message-id="${messageId}"]`)?.parentElement;
	return Number(/translateY\((-?[\d.]+)px\)/.exec(row?.style.transform ?? '')?.[1] ?? Number.NaN);
}

async function scrollTo(element: HTMLElement, top: number) {
	await act(async () => {
		element.scrollTop = top;
		element.dispatchEvent(new Event('scroll'));
	});
}

describe('VirtualTimeline', () => {
	it('draws only the rows near the place of the reader, the newest first', () => {
		render(<Harness items={rowsOf(0, 300)} />);
		const drawn = document.querySelectorAll('[data-message-id]');
		expect(drawn.length).toBeGreaterThan(0);
		expect(drawn.length).toBeLessThan(60);
		// A conversation opens at its newest message.
		expect(screen.getByText('message 299')).toBeTruthy();
		expect(screen.queryByText('message 0')).toBeNull();
	});

	it('gives the list the height of all its rows, so the scroll covers the whole conversation', () => {
		render(<Harness items={rowsOf(0, 300)} />);
		const list = document.querySelector<HTMLElement>('[data-virtual-timeline]');
		expect(Number.parseInt(list?.style.height ?? '0', 10)).toBeGreaterThan(ROW_HEIGHT * 100);
	});

	it('brings a message that is not drawn into view, and says when it holds none', async () => {
		const handle = React.createRef<VirtualTimelineHandle>();
		render(<Harness items={rowsOf(0, 300)} handle={handle} />);
		expect(screen.queryByText('message 5')).toBeNull();
		await act(async () => {
			expect(handle.current?.scrollToMessage('m5')).toBe(true);
		});
		expect(screen.getByText('message 5')).toBeTruthy();
		expect(handle.current?.scrollToMessage('missing')).toBe(false);
	});

	it('keeps the row the reader is at in place when an older page of rows of every height comes in above', async () => {
		const handle = React.createRef<VirtualTimelineHandle>();
		const later = rowsOf(100, 200);
		const { rerender } = render(<Harness items={later} handle={handle} />);
		const scroll = screen.getByTestId('scroll');
		// The reader is up in the conversation, rows drawn (and measured) around them.
		await scrollTo(scroll, 900);
		const anchor = handle.current?.anchor();
		if (!anchor) throw new Error('No row is drawn where the reader is');
		const anchorId = anchor.key.replace('message:', '');
		const shownAt = startOf(anchorId) - scroll.scrollTop;

		// Forty older messages, short and long, come in above.
		rerender(
			<Harness items={[...rowsOf(60, 100, (index) => 'x'.repeat((index % 7) * 90)), ...later]} handle={handle} />
		);
		await act(async () => {
			expect(handle.current?.restore(anchor)).toBe(true);
			scroll.dispatchEvent(new Event('scroll'));
		});
		expect(startOf(anchorId) - scroll.scrollTop).toBe(shownAt);
		expect(scroll.scrollTop).toBeGreaterThan(900);
	});

	it('cannot put back a row that is gone', () => {
		const handle = React.createRef<VirtualTimelineHandle>();
		render(<Harness items={rowsOf(0, 10)} handle={handle} />);
		expect(handle.current?.restore({ key: 'message:gone', delta: 0 })).toBe(false);
	});
});
