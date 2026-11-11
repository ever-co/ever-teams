/** @jest-environment jsdom */

import React, { useRef } from 'react';
import { act, render, screen } from '@testing-library/react';
import type { ChatTimelineItem } from '@/core/lib/utils/chat-timeline';
import type { IChatMessage } from '@/core/types/interfaces/common/chat';
import { VirtualTimeline, type VirtualTimelineHandle } from './chat-virtual-timeline';

const VIEW_HEIGHT = 600;
const ROW_HEIGHT = 50;

function message(index: number): IChatMessage {
	return {
		id: `m${index}`,
		conversationId: 'c1',
		kind: 'message',
		body: `message ${index}`,
		mentionsChannel: false,
		mentionsHere: false,
		alsoInConversation: false,
		replyCount: 0,
		createdAt: new Date(2026, 10, 11, 10, 0, index).toISOString()
	};
}

const ITEMS: ChatTimelineItem[] = Array.from({ length: 300 }, (_, index) => ({
	type: 'message',
	message: message(index),
	continues: true
}));

function Harness({ handle }: { handle?: React.Ref<VirtualTimelineHandle> }) {
	const scroll = useRef<HTMLDivElement | null>(null);
	return (
		<div ref={scroll} data-testid="scroll" style={{ height: VIEW_HEIGHT, overflowY: 'auto' }}>
			<VirtualTimeline
				items={ITEMS}
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

beforeAll(() => {
	// jsdom lays nothing out: the scrolled box is a 600 px view, each drawn row 50 px.
	HTMLElement.prototype.getBoundingClientRect = function rect(this: HTMLElement) {
		const height =
			this.dataset.testid === 'scroll' ? VIEW_HEIGHT : this.dataset.index !== undefined ? ROW_HEIGHT : 0;
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
			return this.dataset.testid === 'scroll' ? VIEW_HEIGHT : this.dataset.index !== undefined ? ROW_HEIGHT : 0;
		}
	});
});

afterAll(() => {
	HTMLElement.prototype.getBoundingClientRect = originalRect;
	if (originalOffsetHeight) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight);
});

describe('VirtualTimeline', () => {
	it('draws only the rows near the place of the reader, the newest first', () => {
		render(<Harness />);
		const drawn = document.querySelectorAll('[data-message-id]');
		expect(drawn.length).toBeGreaterThan(0);
		expect(drawn.length).toBeLessThan(60);
		// A conversation opens at its newest message.
		expect(screen.getByText('message 299')).toBeTruthy();
		expect(screen.queryByText('message 0')).toBeNull();
	});

	it('gives the list the height of all its rows, so the scroll covers the whole conversation', () => {
		render(<Harness />);
		const list = document.querySelector<HTMLElement>('[data-virtual-timeline]');
		expect(Number.parseInt(list?.style.height ?? '0', 10)).toBeGreaterThan(ROW_HEIGHT * 100);
	});

	it('brings a message that is not drawn into view, and says when it holds none', async () => {
		const handle = React.createRef<VirtualTimelineHandle>();
		render(<Harness handle={handle} />);
		const scroll = screen.getByTestId('scroll');
		await act(async () => {
			expect(handle.current?.scrollToMessage('m5')).toBe(true);
		});
		expect(scroll.scrollTop).toBeLessThan(ROW_HEIGHT * 50);
		expect(handle.current?.scrollToMessage('missing')).toBe(false);
	});
});
