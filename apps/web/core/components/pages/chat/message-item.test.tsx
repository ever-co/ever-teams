/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChatOutboxMessage } from '@/core/hooks/chat/use-chat-actions';
import { ChatPerson } from '@/core/lib/utils/chat-format';
import { IChatFile, IChatMessage } from '@/core/types/interfaces/common/chat';
import { MessageItem, MessageItemProps, QUICK_REACTIONS } from './message-item';

jest.mock('next-intl', () => ({
	useLocale: () => 'en-US',
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
// The link previews are tested on their own (chat-link-preview.test.tsx): here, only whether the row mounts them.
jest.mock('./chat-link-preview', () => ({
	MessageLinkPreviews: ({ body }: { body: string }) => <div data-testid="link-previews">{body}</div>
}));
jest.mock('./emoji-popover', () => ({
	EmojiPopover: ({ label, onPick }: { label: string; onPick: (emoji: string) => void }) => <button type="button" aria-label={label} onClick={() => onPick('🚀')} />
}));
// The task card reads the task and changes it: tested on its own (chat-task-card.test.tsx).
jest.mock('./chat-task-card', () => ({
	ChatTaskCard: ({ taskId, title, canChange, onOpenTask }: { taskId: string; title?: string; canChange: boolean; onOpenTask: (taskId: string) => void }) => (
		<button type="button" data-can-change={String(canChange)} onClick={() => onOpenTask(taskId)}>
			{title}
		</button>
	)
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
		const card = screen.getByRole('button', { name: /Ship the page/ });
		expect(card.getAttribute('data-can-change')).toBe('true');
		fireEvent.click(card);
		expect(onOpenTask).toHaveBeenCalledWith('task-1');
	});

	it('never offers to change a task in a read-only conversation (archived)', () => {
		renderItem({ message: message({ taskReferences: [{ messageId: 'm1', taskId: 'task-1', kind: 'sent' }] }), readOnly: true });
		expect(screen.getByRole('button', { name: /Ship the page/ }).getAttribute('data-can-change')).toBe('false');
	});

	it('never offers to change the task of a message still on its way', () => {
		const pending: ChatOutboxMessage = { ...message({ id: 'pending:n3', authorUserId: ME_USER, taskReferences: [{ messageId: 'pending:n3', taskId: 'task-1', kind: 'sent' }] }), outbox: 'pending' };
		renderItem({ message: pending });
		expect(screen.getByRole('button', { name: /Ship the page/ }).getAttribute('data-can-change')).toBe('false');
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

describe('the files of a message', () => {
	function chatFile(documentId: string, extra: Partial<IChatFile> = {}): IChatFile {
		return { documentId, messageId: 'm1', conversationId: 'c1', name: `${documentId}.pdf`, attachedAt: '2026-11-10T14:05:00.000Z', ...extra };
	}

	const files = new Map<string, IChatFile>([
		['doc-shot', chatFile('doc-shot', { name: 'shot.png', mimeType: 'image/png', fileUrl: 'https://cdn.example.com/shot.png', thumbUrl: 'https://cdn.example.com/shot-thumb.png' })],
		['doc-plan', chatFile('doc-plan', { name: 'plan.pdf', mimeType: 'application/pdf', fileSize: 2400, fileUrl: 'https://cdn.example.com/plan.pdf' })],
		['doc-evil', chatFile('doc-evil', { name: 'evil.pdf', mimeType: 'application/pdf', fileUrl: 'javascript:alert(1)' })]
	]);

	it('shows a picture as a thumbnail that opens the lightbox, and a file as a link to it', () => {
		const onOpenImage = jest.fn();
		renderItem({ message: message({ body: 'Look', attachmentIds: ['doc-shot', 'doc-plan'] }), files, onOpenImage });
		const picture = screen.getByRole('button', { name: 'teamChat.VIEW_IMAGE' });
		expect(picture.querySelector('img')?.getAttribute('src')).toBe('https://cdn.example.com/shot-thumb.png');
		fireEvent.click(picture);
		expect(onOpenImage).toHaveBeenCalledWith(files.get('doc-shot'));
		const link = screen.getByRole('link', { name: /plan\.pdf/ });
		expect(link.getAttribute('href')).toBe('https://cdn.example.com/plan.pdf');
		expect(link.getAttribute('rel')).toContain('noopener');
		expect(screen.getByTestId('body').textContent).toBe('Look');
	});

	it('keeps a picture that has only its thumbnail', () => {
		const onOpenImage = jest.fn();
		const small = new Map<string, IChatFile>([
			['doc-small', chatFile('doc-small', { name: 'small.png', mimeType: 'image/png', thumbUrl: 'https://cdn.example.com/small.png', fileUrl: null })]
		]);
		renderItem({ message: message({ attachmentIds: ['doc-small'] }), files: small, onOpenImage });
		fireEvent.click(screen.getByRole('button', { name: 'teamChat.VIEW_IMAGE' }));
		expect(onOpenImage).toHaveBeenCalledWith(small.get('doc-small'));
	});

	it('never links an address that is not a web one', () => {
		renderItem({ message: message({ attachmentIds: ['doc-evil'] }), files });
		expect(screen.queryByRole('link', { name: /evil\.pdf/ })).toBeNull();
		expect(screen.getByText('evil.pdf')).toBeTruthy();
	});

	it('names a file the list does not have yet plainly, and fetches nothing for it', () => {
		const { container } = renderItem({ message: message({ attachmentIds: ['doc-unknown'] }), files });
		expect(screen.getByText('teamChat.ATTACHMENT')).toBeTruthy();
		expect(container.querySelector('img')).toBeNull();
	});

	it('does not repeat the names of the files of a message sent without words', () => {
		renderItem({ message: message({ body: 'shot.png, plan.pdf', attachmentIds: ['doc-shot', 'doc-plan'] }), files });
		expect(screen.queryByTestId('body')).toBeNull();
		expect(screen.getByRole('link', { name: /plan\.pdf/ })).toBeTruthy();
	});

	it('shows a message of files only as its files, named as the message names them before the list has them', () => {
		renderItem({ message: message({ body: '', attachmentIds: ['doc-new'], attachmentNames: 'brief.docx' }), files });
		expect(screen.queryByTestId('body')).toBeNull();
		expect(screen.getByText('brief.docx')).toBeTruthy();
		expect(screen.queryByText('teamChat.DELETED')).toBeNull();
	});

	it('keeps the place of a single picture whose size is known, and leaves it to the picture otherwise', () => {
		const sized = new Map<string, IChatFile>([
			['doc-wide', chatFile('doc-wide', { name: 'wide.png', mimeType: 'image/png', thumbUrl: 'https://cdn.example.com/wide.png', width: 1600, height: 900 })]
		]);
		const { container, unmount } = renderItem({ message: message({ attachmentIds: ['doc-wide'] }), files: sized });
		const image = container.querySelector('img') as HTMLImageElement;
		expect(image.style.width).toBe('320px');
		expect(image.style.aspectRatio).toBe('1600 / 900');
		expect(image.getAttribute('width')).toBe('1600');
		unmount();
		const unsized = renderItem({ message: message({ attachmentIds: ['doc-shot'] }), files });
		const plain = unsized.container.querySelector('img') as HTMLImageElement;
		expect(plain.style.width).toBe('');
		expect(plain.getAttribute('width')).toBeNull();
	});

	it('shows no file of a deleted message', () => {
		renderItem({ message: message({ body: '', attachmentIds: ['doc-plan'], deletedAt: '2026-11-10T15:00:00.000Z' }), files });
		expect(screen.queryByRole('link', { name: /plan\.pdf/ })).toBeNull();
	});
});

describe('the link previews of a message', () => {
	const flag = process.env.NEXT_PUBLIC_CHAT_LINK_PREVIEWS_ENABLED;
	afterEach(() => {
		if (flag === undefined) delete process.env.NEXT_PUBLIC_CHAT_LINK_PREVIEWS_ENABLED;
		else process.env.NEXT_PUBLIC_CHAT_LINK_PREVIEWS_ENABLED = flag;
	});

	it('are not there with the flag off', () => {
		delete process.env.NEXT_PUBLIC_CHAT_LINK_PREVIEWS_ENABLED;
		renderItem({ message: message({ body: 'See https://example.com' }) });
		expect(screen.queryByTestId('link-previews')).toBeNull();
	});

	it('show under a sent message with the flag on, and not under one being sent, failed or deleted', () => {
		process.env.NEXT_PUBLIC_CHAT_LINK_PREVIEWS_ENABLED = 'true';
		const { unmount } = renderItem({ message: message({ body: 'See https://example.com' }) });
		expect(screen.getByTestId('link-previews').textContent).toBe('See https://example.com');
		unmount();
		for (const outbox of ['pending', 'failed'] as const) {
			const sending: ChatOutboxMessage = { ...message({ id: `pending:${outbox}`, authorUserId: ME_USER, body: 'https://example.com' }), outbox };
			const view = renderItem({ message: sending });
			expect(screen.queryByTestId('link-previews')).toBeNull();
			view.unmount();
		}
		renderItem({ message: message({ body: 'https://example.com', deletedAt: '2026-11-10T15:00:00.000Z' }) });
		expect(screen.queryByTestId('link-previews')).toBeNull();
	});
});
