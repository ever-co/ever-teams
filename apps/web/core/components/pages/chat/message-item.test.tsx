/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChatOutboxMessage } from '@/core/hooks/chat/use-chat-actions';
import { ChatPerson } from '@/core/lib/utils/chat-format';
import { IChatMessage } from '@/core/types/interfaces/common/chat';
import { MessageItem, MessageItemProps, QUICK_REACTIONS } from './message-item';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) => {
		const shown = Object.entries(values ?? {}).filter(([name]) => name !== 'name');
		return shown.length ? `${key}:${shown.map(([, value]) => String(value)).join(',')}` : key;
	}
}));
// The Markdown renderer and the emoji picker are heavy and tested on their own: the row around them is what is tested here.
jest.mock('./chat-markdown', () => ({
	ChatMarkdown: ({ body, className }: { body: string; className?: string }) => (
		<div data-testid="body" className={className}>
			{body}
		</div>
	)
}));
jest.mock('./emoji-popover', () => ({
	EmojiPopover: ({ label, onPick }: { label: string; onPick: (emoji: string) => void }) => <button type="button" aria-label={label} onClick={() => onPick('🚀')} />
}));

const ME_USER = 'user-me';
const ANA: ChatPerson = { employeeId: 'employee-ana', userId: 'user-ana', name: 'Ana Silva' };
const NOW = new Date(2026, 10, 10, 15, 0);

function message(extra: Partial<IChatMessage> = {}): IChatMessage {
	return {
		id: 'm1',
		conversationId: 'c1',
		authorUserId: 'user-ana',
		authorEmployeeId: ANA.employeeId,
		kind: 'message',
		body: 'Hello team',
		mentionsChannel: false,
		mentionsHere: false,
		alsoInConversation: false,
		replyCount: 0,
		createdAt: new Date(2026, 10, 10, 14, 5).toISOString(),
		...extra
	};
}

function renderItem(props: Partial<MessageItemProps> = {}) {
	const handlers = {
		onReact: jest.fn(),
		onReply: jest.fn(),
		onEdit: jest.fn(),
		onDelete: jest.fn(),
		onPin: jest.fn(),
		onUnreadFrom: jest.fn(),
		onRetry: jest.fn(),
		onDiscard: jest.fn(),
		onCopyLink: jest.fn(),
		onOpenTask: jest.fn(),
		onCreateTask: jest.fn()
	};
	const view = render(
		<MessageItem
			message={message()}
			author={ANA}
			people={new Map([[ANA.employeeId, ANA]])}
			conversationNames={new Map()}
			meEmployeeId="employee-me"
			meUserId={ME_USER}
			locale="en-US"
			continues={false}
			inTimeline
			canManage={false}
			now={NOW.getTime()}
			taskTitles={new Map([['task-1', 'Ship the page']])}
			{...handlers}
			{...props}
		/>
	);
	return { ...handlers, ...view };
}

const quick = (emoji: string) => screen.queryByRole('button', { name: `teamChat.REACT_WITH:${emoji}` });

describe('a message row', () => {
	it('opens a group with its author and its time, and carries its id for links to it', () => {
		const { container } = renderItem();
		expect(screen.getByText('Ana Silva')).toBeTruthy();
		expect(screen.getByText(/2:05/).tagName).toBe('TIME');
		expect(screen.getByTestId('body').textContent).toBe('Hello team');
		expect(container.querySelector('[data-message-id="m1"]')).toBeTruthy();
	});

	it('continues a group without the header, its time waiting in the gutter', () => {
		renderItem({ continues: true });
		expect(screen.queryByText('Ana Silva')).toBeNull();
		// Without the day period: the gutter is as wide as an avatar.
		expect(screen.getByText('2:05').tagName).toBe('TIME');
	});

	it('names an app when nobody of the team wrote the message', () => {
		renderItem({ author: null, message: message({ authorEmployeeId: null, authorUserId: null, appName: 'Deploys' }) });
		expect(screen.getByText('Deploys')).toBeTruthy();
	});

	it('says a pinned message is pinned, on its own line', () => {
		renderItem({ message: message({ pinnedAt: NOW.toISOString() }) });
		expect(screen.getByText('teamChat.PINNED')).toBeTruthy();
	});

	it('marks an edited message right after its text', () => {
		renderItem({ message: message({ editedAt: NOW.toISOString() }) });
		expect(screen.getByText('teamChat.EDITED')).toBeTruthy();
		expect(screen.getByTestId('body').className).toContain('inline');
	});

	it('shows a deleted message as a note, with nothing to do on it', () => {
		renderItem({ message: message({ body: '', deletedAt: NOW.toISOString(), editedAt: NOW.toISOString() }) });
		expect(screen.getByText('teamChat.DELETED')).toBeTruthy();
		expect(screen.queryByTestId('body')).toBeNull();
		expect(screen.queryByText('teamChat.EDITED')).toBeNull();
		expect(screen.queryByRole('button', { name: 'teamChat.MORE' })).toBeNull();
		expect(quick(QUICK_REACTIONS[0])).toBeNull();
	});
});

describe('reactions', () => {
	it('offers three quick reactions, the picker, the thread and the menu on the toolbar', () => {
		const { onReact, onReply } = renderItem();
		expect(QUICK_REACTIONS.map((emoji) => !!quick(emoji))).toEqual([true, true, true, false, false]);
		fireEvent.click(quick(QUICK_REACTIONS[1]) as HTMLElement);
		expect(onReact).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'm1' }), QUICK_REACTIONS[1]);
		fireEvent.click(screen.getByRole('button', { name: 'teamChat.ADD_REACTION' }));
		expect(onReact).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'm1' }), '🚀');
		fireEvent.click(screen.getByRole('button', { name: 'teamChat.REPLY_IN_THREAD' }));
		expect(onReply).toHaveBeenCalledTimes(1);
		expect(screen.getByRole('button', { name: 'teamChat.MORE' })).toBeTruthy();
	});

	it('leaves the thread control out inside a thread', () => {
		renderItem({ inTimeline: false, message: message({ replyCount: 3 }) });
		expect(screen.queryByRole('button', { name: 'teamChat.REPLY_IN_THREAD' })).toBeNull();
		expect(screen.queryByText('teamChat.REPLIES:3')).toBeNull();
	});

	it('shows the reactions as pills that toggle, with one more to add another', () => {
		const { onReact } = renderItem({
			message: message({
				reactions: [
					{ emoji: '🎉', count: 2, mine: true },
					{ emoji: '👀', count: 1, mine: false }
				]
			})
		});
		const mine = screen.getByRole('button', { name: /🎉/, pressed: true });
		expect(mine.textContent).toBe('🎉2');
		fireEvent.click(screen.getByRole('button', { name: /👀/, pressed: false }));
		expect(onReact).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'm1' }), '👀');
		// The toolbar's picker, and the pill at the end of the reactions.
		expect(screen.getAllByRole('button', { name: 'teamChat.ADD_REACTION' })).toHaveLength(2);
	});
});

describe('a thread under its first message', () => {
	it('sums the thread up (how many replies, when the last one came) and opens it', () => {
		const lastReplyAt = new Date(NOW.getTime() - 5 * 60_000).toISOString();
		const { onReply } = renderItem({ message: message({ replyCount: 3, lastReplyAt }) });
		const summary = screen.getByRole('button', { name: /teamChat\.REPLIES:3/ });
		expect(summary.textContent).toContain('teamChat.LAST_REPLY:5 minutes ago');
		fireEvent.click(summary);
		expect(onReply).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }));
	});

	it('has no summary without replies', () => {
		renderItem();
		expect(screen.queryByText(/teamChat\.REPLIES/)).toBeNull();
	});
});

describe('a task and an unsent message', () => {
	it('shows a task as a card that opens it', () => {
		const { onOpenTask } = renderItem({ message: message({ taskReferences: [{ messageId: 'm1', taskId: 'task-1', kind: 'sent' }] }) });
		fireEvent.click(screen.getByRole('button', { name: /Ship the page/ }));
		expect(onOpenTask).toHaveBeenCalledWith('task-1');
	});

	it('offers to retry or discard a message that was not sent, and nothing else', () => {
		const failed: ChatOutboxMessage = { ...message({ id: 'pending:n1', authorUserId: ME_USER }), outbox: 'failed' };
		const { onRetry, onDiscard } = renderItem({ message: failed });
		expect(screen.getByText('teamChat.SEND_FAILED')).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'teamChat.RETRY' }));
		expect(onRetry).toHaveBeenCalledWith(failed);
		fireEvent.click(screen.getByRole('button', { name: 'teamChat.DISCARD' }));
		expect(onDiscard).toHaveBeenCalledWith(failed);
		expect(screen.queryByRole('button', { name: 'teamChat.MORE' })).toBeNull();
	});

	it('dims a message still on its way', () => {
		const pending: ChatOutboxMessage = { ...message({ id: 'pending:n2', authorUserId: ME_USER }), outbox: 'pending' };
		renderItem({ message: pending });
		expect(screen.getByTestId('body').className).toContain('opacity-60');
		expect(screen.queryByText('teamChat.SEND_FAILED')).toBeNull();
	});
});
