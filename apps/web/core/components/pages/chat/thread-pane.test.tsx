/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { IChatMessage } from '@/core/types/interfaces/common/chat';
import { ThreadPane } from './thread-pane';

const ME_USER = 'user-me';
const BO_USER = 'user-bo';
const BO_EMPLOYEE = 'employee-bo';

const mockActions = {
	send: jest.fn(async () => undefined),
	setFollow: jest.fn(async () => undefined),
	react: jest.fn(async () => undefined),
	edit: jest.fn(async () => undefined),
	remove: jest.fn(async () => undefined),
	pin: jest.fn(async () => undefined),
	unreadFrom: jest.fn(async () => undefined),
	retry: jest.fn(async () => undefined),
	discardFailed: jest.fn()
};
const mockThread = { root: null as IChatMessage | null, replies: [] as IChatMessage[], hasAfter: false, isLoading: false, isError: false, retry: jest.fn() };
const mockAttachments = {
	items: [] as Array<{ key: string; name: string; size: number; mimeType: string; status: 'uploading' | 'ready' | 'failed'; documentId?: string }>,
	add: jest.fn(),
	remove: jest.fn(),
	retry: jest.fn(),
	clear: jest.fn(),
	readyIds: [] as string[],
	isUploading: false,
	canAttach: true
};
const mockFiles = { files: [], byId: new Map(), hasMore: false, isLoading: false, isError: false, isLoadingMore: false, loadMore: jest.fn(), refresh: jest.fn() };
const mockDraft = { draft: '', setDraft: jest.fn(), clearDraft: jest.fn() };
const mockBo = { employeeId: BO_EMPLOYEE, userId: BO_USER, name: 'Bo Chen' };
const mockPeople = { byEmployee: new Map([[BO_EMPLOYEE, mockBo]]), byUser: new Map([[BO_USER, mockBo]]), list: [mockBo] };
const mockScope = { tenantId: 't', organizationId: 'o', userId: ME_USER, employeeId: 'employee-me' };

jest.mock('next-intl', () => ({
	useLocale: () => 'en-US',
	useTranslations: () => (key: string, values?: Record<string, unknown>) => {
		const shown = Object.values(values ?? {});
		return shown.length ? `${key}:${shown.map(String).join(',')}` : key;
	}
}));
jest.mock('sonner', () => ({ toast: Object.assign(jest.fn(), { error: jest.fn() }) }));
jest.mock('@/core/hooks/chat/use-chat-actions', () => ({
	useChatActions: () => mockActions,
	isOutboxMessage: (message: object) => 'outbox' in message
}));
jest.mock('@/core/hooks/chat/use-chat-attachments', () => ({ useChatAttachments: () => mockAttachments, uploadedFileOf: () => undefined }));
jest.mock('@/core/hooks/chat/use-chat-files', () => ({ useChatFiles: () => mockFiles }));
jest.mock('@/core/hooks/chat/use-chat-draft', () => ({ useChatDraft: () => mockDraft }));
jest.mock('@/core/hooks/chat/use-chat-messages', () => ({ useChatThread: () => mockThread }));
jest.mock('@/core/hooks/chat/use-chat-scope', () => ({ useChatScope: () => mockScope, useChatPeople: () => mockPeople }));
jest.mock('@/core/hooks/chat/use-chat-conversations', () => ({ useChatMembers: () => ({ members: [], isLoading: false }) }));
jest.mock('@/core/hooks/tasks/use-task-drawer', () => ({ useTaskDrawer: () => ({ openTaskDrawer: jest.fn() }) }));
jest.mock('@/core/stores/teams/team-tasks', () => {
	const { atom } = jest.requireActual<typeof import('jotai')>('jotai');
	return { tasksByTeamState: atom([]) };
});
jest.mock('./chat-markdown', () => ({ ChatMarkdown: ({ body }: { body: string }) => <div>{body}</div> }));
jest.mock('./emoji-popover', () => ({ EmojiPopover: ({ label }: { label: string }) => <button type="button" aria-label={label} /> }));
jest.mock('./create-task-dialog', () => ({ CreateTaskFromMessageDialog: () => null }));

const at = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute).toISOString();

function message(id: string, createdAt: string, extra: Partial<IChatMessage> = {}): IChatMessage {
	return {
		id,
		conversationId: 'c1',
		authorUserId: BO_USER,
		authorEmployeeId: BO_EMPLOYEE,
		kind: 'message',
		body: `body of ${id}`,
		mentionsChannel: false,
		mentionsHere: false,
		alsoInConversation: false,
		replyCount: 0,
		createdAt,
		...extra
	};
}

function pane(props: Partial<React.ComponentProps<typeof ThreadPane>> = {}) {
	return <ThreadPane conversationId="c1" rootMessageId="root" conversationNames={new Map([['c1', 'general']])} canManage={false} onClose={jest.fn()} {...props} />;
}

/** The pane's rows, top to bottom: `day`, `replies` (the line that counts them) or a message id. */
function rows(): string[] {
	return [...screen.getByRole('log').querySelectorAll('[role="separator"], [data-message-id]')].map((element) => {
		const id = element.getAttribute('data-message-id');
		if (id) return id;
		return (element.getAttribute('aria-label') ?? '').startsWith('teamChat.REPLIES') ? 'replies' : 'day';
	});
}

beforeEach(() => {
	Object.assign(mockThread, { root: null, replies: [], isLoading: false, isError: false });
});

describe('the thread pane', () => {
	it('names the thread and its conversation, and closes', () => {
		const onClose = jest.fn();
		mockThread.root = message('root', at(9, 10));
		render(pane({ onClose }));
		expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('teamChat.THREAD');
		expect(screen.getByText('#general')).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'teamChat.CLOSE' }));
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('prefers the name the page gives it (a direct conversation has no channel name)', () => {
		mockThread.root = message('root', at(9, 10));
		render(pane({ conversationLabel: 'Bo Chen', conversationNames: new Map() }));
		expect(screen.getAllByText('Bo Chen').length).toBeGreaterThan(1);
	});

	it('shows the first message, the count of replies, then the replies with a divider where the day changes', () => {
		mockThread.root = message('root', at(9, 10), { replyCount: 3 });
		mockThread.replies = [message('r1', at(9, 10, 5)), message('r2', at(9, 10, 6)), message('r3', at(10, 9, 0))];
		render(pane());
		expect(rows()).toEqual(['day', 'root', 'replies', 'r1', 'r2', 'day', 'r3']);
		expect(screen.getByRole('separator', { name: 'teamChat.REPLIES:3' })).toBeTruthy();
		// The first reply never joins the first message's group: the line stands between them.
		expect(screen.getAllByText('Bo Chen')).toHaveLength(3);
	});

	it('invites a first reply when there is none', () => {
		mockThread.root = message('root', at(9, 10));
		render(pane());
		expect(rows()).toEqual(['day', 'root']);
		expect(screen.getByText('teamChat.NO_REPLIES')).toBeTruthy();
	});

	it('follows and unfollows the thread', async () => {
		mockThread.root = message('root', at(9, 10), { following: true });
		render(pane());
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'teamChat.UNFOLLOW' }));
		});
		expect(mockActions.setFollow).toHaveBeenCalledWith(mockThread.root, false);
	});

	it('sends a reply into the thread, to the conversation too when asked', async () => {
		mockThread.root = message('root', at(9, 10));
		mockDraft.draft = 'a reply';
		render(pane());
		fireEvent.click(screen.getByRole('checkbox', { name: 'teamChat.ALSO_SEND_TO_CONVERSATION' }));
		await act(async () => {
			fireEvent.keyDown(screen.getByRole('textbox', { name: 'teamChat.REPLY_PLACEHOLDER' }), { key: 'Enter' });
		});
		expect(mockActions.send).toHaveBeenCalledWith('c1', { body: 'a reply', threadRootId: 'root', alsoInConversation: true });
		mockDraft.draft = '';
	});

	it('shows placeholders while loading, and the way to retry when nothing could load', () => {
		mockThread.isLoading = true;
		const { rerender } = render(pane());
		expect(screen.getByRole('log').getAttribute('aria-busy')).toBe('true');
		Object.assign(mockThread, { isLoading: false, isError: true });
		rerender(pane());
		fireEvent.click(screen.getByRole('button', { name: 'teamChat.RETRY' }));
		expect(mockThread.retry).toHaveBeenCalledTimes(1);
	});
});
