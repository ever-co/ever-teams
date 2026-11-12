/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { EChatConversationKind, EChatNotifyLevel, EChatVisibility, IChatConversationWithState, IChatMemberState, IChatMessage } from '@/core/types/interfaces/common/chat';
import { ConversationView } from './conversation-view';

const ME_USER = 'user-me';
const ME_EMPLOYEE = 'employee-me';
const BO_USER = 'user-bo';
const BO_EMPLOYEE = 'employee-bo';

const mockActions = {
	read: jest.fn(async () => undefined),
	send: jest.fn(async () => undefined),
	unreadFrom: jest.fn(async () => undefined),
	react: jest.fn(async () => undefined),
	setMemberState: jest.fn(async () => undefined),
	leave: jest.fn(async () => undefined),
	edit: jest.fn(async () => undefined),
	remove: jest.fn(async () => undefined),
	pin: jest.fn(async () => undefined),
	retry: jest.fn(async () => undefined),
	discardFailed: jest.fn()
};
const mockTimeline = {
	messages: [] as IChatMessage[],
	hasBefore: false,
	hasAfter: false,
	isLoading: false,
	isError: false,
	isLoadingOlder: false,
	loadOlder: jest.fn(async () => undefined),
	jumpTo: jest.fn(async () => true),
	retry: jest.fn(),
	newestId: null as string | null
};
const mockAttachments = {
	items: [] as Array<{ key: string; name: string; size: number; mimeType: string; status: 'uploading' | 'ready' | 'failed'; documentId?: string }>,
	add: jest.fn(),
	remove: jest.fn(),
	retry: jest.fn(),
	releaseSent: jest.fn(),
	readyIds: [] as string[],
	isUploading: false,
	canAttach: true
};
const mockFiles = { files: [], byId: new Map(), hasMore: false, isLoading: false, isError: false, isLoadingMore: false, loadMore: jest.fn(), refresh: jest.fn() };
const mockDraft = { draft: '', setDraft: jest.fn(), clearDraft: jest.fn() };
const mockBo = { employeeId: BO_EMPLOYEE, userId: BO_USER, name: 'Bo Chen' };
const mockMe = { employeeId: ME_EMPLOYEE, userId: ME_USER, name: 'Me Myself' };
const mockPeople = {
	byEmployee: new Map([
		[BO_EMPLOYEE, mockBo],
		[ME_EMPLOYEE, mockMe]
	]),
	byUser: new Map([
		[BO_USER, mockBo],
		[ME_USER, mockMe]
	]),
	list: [mockBo, mockMe]
};
const mockScope = { tenantId: 't', organizationId: 'o', userId: ME_USER, employeeId: ME_EMPLOYEE };
const mockSignalTyping = jest.fn();
let mockTypists: Array<{ userId: string; employeeId: string | null; conversationId: string; threadRootId: string | null; expiresAt: number }> = [];

jest.mock('next-intl', () => ({
	useLocale: () => 'en-US',
	useTranslations: () => (key: string, values?: Record<string, unknown>) => {
		const shown = Object.values(values ?? {});
		return shown.length ? `${key}:${shown.map(String).join(',')}` : key;
	}
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('sonner', () => ({ toast: Object.assign(jest.fn(), { error: jest.fn() }) }));
jest.mock('@/core/hooks/chat/use-chat-actions', () => ({
	useChatActions: () => mockActions,
	isOutboxMessage: (message: object) => 'outbox' in message
}));
jest.mock('@/core/hooks/chat/use-chat-attachments', () => ({ useChatAttachments: () => mockAttachments, uploadedFileOf: () => undefined }));
jest.mock('@/core/hooks/chat/use-chat-files', () => ({ useChatFiles: () => mockFiles }));
jest.mock('@/core/hooks/chat/use-chat-draft', () => ({ useChatDraft: () => mockDraft }));
jest.mock('@/core/hooks/chat/use-chat-messages', () => ({ useChatMessages: () => mockTimeline }));
jest.mock('@/core/hooks/chat/use-chat-scope', () => ({ useChatScope: () => mockScope, useChatPeople: () => mockPeople }));
jest.mock('@/core/hooks/chat/use-chat-conversations', () => ({ useChatMembers: () => ({ members: [], isLoading: false }) }));
jest.mock('@/core/hooks/chat/use-chat-typing', () => ({ useChatTypingSignal: () => mockSignalTyping, useChatTypists: () => mockTypists }));
jest.mock('./chat-task-card', () => ({ ChatTaskCard: () => null }));
jest.mock('@/core/hooks/tasks/use-task-drawer', () => ({ useTaskDrawer: () => ({ openTaskDrawer: jest.fn() }) }));
jest.mock('@/core/stores/teams/team-tasks', () => {
	const { atom } = jest.requireActual<typeof import('jotai')>('jotai');
	return { tasksByTeamState: atom([]) };
});
// Heavy leaves, tested on their own: the pane around them is what is tested here.
jest.mock('./chat-markdown', () => ({ ChatMarkdown: ({ body }: { body: string }) => <div>{body}</div> }));
jest.mock('./emoji-popover', () => ({ EmojiPopover: ({ label }: { label: string }) => <button type="button" aria-label={label} /> }));
jest.mock('./create-task-dialog', () => ({ CreateTaskFromMessageDialog: () => null }));

const at = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute).toISOString();

function message(id: string, createdAt: string, mine = false, extra: Partial<IChatMessage> = {}): IChatMessage {
	return {
		id,
		conversationId: 'c1',
		authorUserId: mine ? ME_USER : BO_USER,
		authorEmployeeId: mine ? ME_EMPLOYEE : BO_EMPLOYEE,
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

function state(extra: Partial<IChatMemberState> = {}): IChatMemberState {
	return { conversationId: 'c1', role: 'member', notifyLevel: EChatNotifyLevel.All, isFavorite: false, unreadCount: 0, mentionCount: 0, lastReadMessageId: null, lastReadAt: null, ...extra };
}

function conversation(extra: Partial<IChatConversationWithState> = {}): IChatConversationWithState {
	return {
		id: 'c1',
		kind: EChatConversationKind.Channel,
		name: 'general',
		topic: 'Everything about the launch',
		visibility: EChatVisibility.Public,
		position: 0,
		isDefault: true,
		messageCount: 3,
		memberCount: 4,
		state: state(),
		...extra
	};
}

function show(messages: IChatMessage[], extra: Partial<typeof mockTimeline> = {}) {
	Object.assign(mockTimeline, { messages, newestId: messages.length ? messages[messages.length - 1].id : null, hasBefore: false, isLoading: false, isError: false, isLoadingOlder: false, ...extra });
}

function view(current: IChatConversationWithState, jumpToMessageId: string | null = null) {
	return <ConversationView conversation={current} conversationNames={new Map([['c1', 'general']])} canManage={false} onOpenThread={jest.fn()} onBack={jest.fn()} jumpToMessageId={jumpToMessageId} />;
}

/** The timeline's rows, top to bottom: `day`, `new`, or a message id. */
function rows(): string[] {
	return [...screen.getByRole('log').querySelectorAll('[role="separator"], [data-message-id]')].map((element) => {
		const id = element.getAttribute('data-message-id');
		if (id) return id;
		return element.getAttribute('aria-label') === 'teamChat.NEW_DIVIDER' ? 'new' : 'day';
	});
}

/** Puts the reader `distance` pixels above the newest message (this DOM lays nothing out, so the sizes are given). */
function scrollTo(distance: number, scrollTop = 1000) {
	const log = screen.getByRole('log');
	Object.defineProperty(log, 'scrollHeight', { configurable: true, value: scrollTop + 500 + distance });
	Object.defineProperty(log, 'clientHeight', { configurable: true, value: 500 });
	log.scrollTop = scrollTop;
	fireEvent.scroll(log);
}

beforeAll(() => {
	// Every browser has `CSS.escape`; this DOM does not. The ids of the tests need no escaping.
	(globalThis as { CSS?: unknown }).CSS = { escape: (value: string) => value };
});

beforeEach(() => {
	show([]);
});

describe('the timeline', () => {
	it('opens an empty conversation on its start, with the composer ready', () => {
		render(view(conversation()));
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('general');
		expect(screen.getByText('teamChat.START_OF_CHANNEL:general')).toBeTruthy();
		// The topic introduces the channel (it also stands in the header).
		expect(screen.getAllByText('Everything about the launch').length).toBeGreaterThan(0);
		expect(screen.getByText('teamChat.EMPTY_CONVERSATION')).toBeTruthy();
		expect(screen.getByRole('textbox', { name: 'teamChat.COMPOSER_PLACEHOLDER:general' })).toBeTruthy();
	});

	it('divides the days and groups the messages of one author', () => {
		show([message('m1', at(9, 10, 0)), message('m2', at(9, 10, 1)), message('m3', at(10, 9, 0), true)]);
		render(view(conversation()));
		expect(rows()).toEqual(['day', 'm1', 'm2', 'day', 'm3']);
		// A grouped message has no author header of its own.
		expect(screen.getAllByText('Bo Chen')).toHaveLength(1);
	});

	it('offers the older messages instead of the start while there are some', () => {
		show([message('m1', at(9, 10, 0))], { hasBefore: true });
		render(view(conversation()));
		expect(screen.queryByText('teamChat.START_OF_CHANNEL:general')).toBeNull();
		fireEvent.click(screen.getByRole('button', { name: 'teamChat.LOAD_OLDER' }));
		expect(mockTimeline.loadOlder).toHaveBeenCalledTimes(1);
	});

	it('shows placeholders while loading and the way to retry when it failed', () => {
		show([], { isLoading: true });
		const { rerender } = render(view(conversation()));
		expect(screen.getByRole('log').getAttribute('aria-busy')).toBe('true');
		expect(screen.queryByText('teamChat.EMPTY_CONVERSATION')).toBeNull();
		show([], { isError: true });
		rerender(view(conversation()));
		fireEvent.click(screen.getByRole('button', { name: 'teamChat.RETRY' }));
		expect(mockTimeline.retry).toHaveBeenCalledTimes(1);
	});

	it('shows an archived conversation without a composer', () => {
		render(view(conversation({ archivedAt: at(1, 0) })));
		expect(screen.getByText('teamChat.ARCHIVED_NOTICE')).toBeTruthy();
		expect(screen.queryByRole('textbox')).toBeNull();
	});
});

describe('the "New" line', () => {
	const messages = [message('m1', at(9, 10, 0)), message('m2', at(9, 10, 30), true), message('m3', at(9, 11, 0)), message('m4', at(9, 11, 30))];

	it('stands above the first message of someone else after the last read one, and stays once the conversation is read', () => {
		show(messages);
		const unread = conversation({ state: state({ unreadCount: 2, lastReadMessageId: 'm1', lastReadAt: at(9, 10, 0) }) });
		const { rerender } = render(view(unread));
		expect(rows()).toEqual(['day', 'm1', 'm2', 'new', 'm3', 'm4']);
		// Viewing it at the bottom read it: the list now says so, and the line stays where the reader had got to.
		expect(mockActions.read).toHaveBeenCalledWith('c1');
		rerender(view(conversation({ state: state({ unreadCount: 0, lastReadMessageId: 'm4', lastReadAt: at(9, 12) }) })));
		expect(rows()).toEqual(['day', 'm1', 'm2', 'new', 'm3', 'm4']);
	});

	it('is absent from a conversation opened with nothing unread, whatever arrives while it is open', () => {
		show(messages.slice(0, 2));
		const { rerender } = render(view(conversation({ state: state({ lastReadMessageId: 'm2', lastReadAt: at(9, 10, 30) }) })));
		expect(rows()).toEqual(['day', 'm1', 'm2']);
		expect(mockActions.read).not.toHaveBeenCalled();
		show(messages);
		rerender(view(conversation({ state: state({ unreadCount: 2, lastReadMessageId: 'm2', lastReadAt: at(9, 10, 30) }) })));
		expect(rows()).toEqual(['day', 'm1', 'm2', 'm3', 'm4']);
	});

	it('starts afresh with another conversation', () => {
		show(messages);
		const { rerender } = render(view(conversation({ state: state({ unreadCount: 2, lastReadMessageId: 'm1' }) })));
		expect(rows()).toContain('new');
		rerender(view(conversation({ id: 'c2', name: 'random', state: state() })));
		expect(rows()).not.toContain('new');
	});
});

describe('reading and following', () => {
	const unread = () => conversation({ state: state({ unreadCount: 1, lastReadMessageId: 'm1', lastReadAt: at(9, 10, 0) }) });

	it('does not read the conversation while the reader is further up, and reads it once they are back at the bottom', () => {
		show([message('m1', at(9, 10, 0))]);
		const { rerender } = render(view(conversation({ state: state({ lastReadMessageId: 'm1' }) })));
		scrollTo(900);
		show([message('m1', at(9, 10, 0)), message('m2', at(9, 11, 0))]);
		rerender(view(unread()));
		expect(mockActions.read).not.toHaveBeenCalled();
		scrollTo(0);
		expect(mockActions.read).toHaveBeenCalledWith('c1');
	});

	it('offers to jump to the latest when far up, counting what arrived meanwhile from others', () => {
		show([message('m1', at(9, 10, 0))]);
		const { rerender } = render(view(conversation({ state: state({ lastReadMessageId: 'm1' }) })));
		expect(screen.queryByRole('button', { name: /JUMP_TO_LATEST|NEW_MESSAGES/ })).toBeNull();
		scrollTo(900);
		expect(screen.getByRole('button', { name: 'teamChat.JUMP_TO_LATEST' })).toBeTruthy();
		show([message('m1', at(9, 10, 0)), message('m2', at(9, 11, 0)), message('m3', at(9, 11, 1), true), message('m4', at(9, 11, 2))]);
		rerender(view(unread()));
		const pill = screen.getByRole('button', { name: 'teamChat.NEW_MESSAGES:2' });
		const log = screen.getByRole('log');
		log.scrollTo = jest.fn();
		fireEvent.click(pill);
		expect(log.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: log.scrollHeight }));
		scrollTo(0);
		expect(screen.queryByRole('button', { name: /JUMP_TO_LATEST|NEW_MESSAGES/ })).toBeNull();
	});

	it('shows the pill a little way up only when something new waits below', () => {
		show([message('m1', at(9, 10, 0))]);
		const { rerender } = render(view(conversation({ state: state({ lastReadMessageId: 'm1' }) })));
		scrollTo(120);
		expect(screen.queryByRole('button', { name: /JUMP_TO_LATEST|NEW_MESSAGES/ })).toBeNull();
		show([message('m1', at(9, 10, 0)), message('m2', at(9, 11, 0))]);
		rerender(view(unread()));
		expect(screen.getByRole('button', { name: 'teamChat.NEW_MESSAGES:1' })).toBeTruthy();
	});

	it('loads the older page when the reader reaches the top', async () => {
		show([message('m1', at(9, 10, 0))], { hasBefore: true });
		render(view(conversation()));
		await act(async () => {
			scrollTo(900, 20);
		});
		expect(mockTimeline.loadOlder).toHaveBeenCalledTimes(1);
	});

	it('keeps the place when the older page comes in, unless the reader jumped to the latest meanwhile', async () => {
		const frame = jest.spyOn(window, 'requestAnimationFrame').mockImplementation((run) => {
			run(0);
			return 0;
		});
		const pages: Array<() => void> = [];
		mockTimeline.loadOlder.mockImplementation(() => new Promise<undefined>((done) => pages.push(() => done(undefined))));
		show([message('m1', at(9, 10, 0))], { hasBefore: true });
		render(view(conversation()));
		const log = screen.getByRole('log');
		log.scrollTo = jest.fn();
		scrollTo(900, 20);
		// The older page lands: 300 px more above what the reader looks at.
		Object.defineProperty(log, 'scrollHeight', { configurable: true, value: 20 + 500 + 900 + 300 });
		await act(async () => {
			pages[0]();
		});
		expect(log.scrollTop).toBe(320);

		// Up again, then "Jump to latest" while the next page loads: that page does not move the reader back up.
		scrollTo(900, 20);
		expect(pages).toHaveLength(2);
		fireEvent.click(screen.getByRole('button', { name: 'teamChat.JUMP_TO_LATEST' }));
		Object.defineProperty(log, 'scrollHeight', { configurable: true, value: 20 + 500 + 900 + 300 });
		await act(async () => {
			pages[1]();
		});
		expect(log.scrollTop).toBe(20);
		frame.mockRestore();
		mockTimeline.loadOlder.mockImplementation(async () => undefined);
	});

	it('scrolls to a linked message once and lights it', () => {
		const scrollIntoView = jest.fn();
		Element.prototype.scrollIntoView = scrollIntoView;
		show([message('m1', at(9, 10, 0)), message('m2', at(9, 11, 0))]);
		const { rerender } = render(view(conversation(), 'm1'));
		const target = screen.getByRole('log').querySelector('[data-message-id="m1"]') as HTMLElement;
		expect(scrollIntoView).toHaveBeenCalledTimes(1);
		expect(target.dataset.highlight).toBe('true');
		rerender(view(conversation(), 'm1'));
		expect(scrollIntoView).toHaveBeenCalledTimes(1);
	});

	it('asks for the page around a linked message that is not loaded', () => {
		show([message('m2', at(9, 11, 0))]);
		render(view(conversation(), 'm-old'));
		expect(mockTimeline.jumpTo).toHaveBeenCalledWith('m-old');
	});
});

describe('writing', () => {
	it('sends what was written and clears the draft', async () => {
		mockDraft.draft = 'hello there';
		render(view(conversation()));
		await act(async () => {
			fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
		});
		expect(mockDraft.clearDraft).toHaveBeenCalled();
		expect(mockActions.send).toHaveBeenCalledWith('c1', { body: 'hello there' }, { attachmentNames: '' });
		mockDraft.draft = '';
	});

	it('sends the uploaded files with the message, and lets go of them', async () => {
		mockDraft.draft = 'the plan';
		mockAttachments.items = [{ key: 'k1', name: 'plan.pdf', size: 10, mimeType: 'application/pdf', status: 'ready', documentId: 'doc-1' }];
		mockAttachments.readyIds = ['doc-1'];
		render(view(conversation()));
		await act(async () => {
			fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
		});
		expect(mockActions.send).toHaveBeenCalledWith('c1', { body: 'the plan', attachmentIds: ['doc-1'] }, { attachmentNames: 'plan.pdf' });
		expect(mockAttachments.releaseSent).toHaveBeenCalled();
		mockDraft.draft = '';
		mockAttachments.items = [];
		mockAttachments.readyIds = [];
	});

	it('sends a message of files alone with no text, its files named for the message shown meanwhile', async () => {
		mockAttachments.items = [
			{ key: 'k1', name: 'plan.pdf', size: 10, mimeType: 'application/pdf', status: 'ready', documentId: 'doc-1' },
			{ key: 'k2', name: 'shot.png', size: 10, mimeType: 'image/png', status: 'ready', documentId: 'doc-2' }
		];
		mockAttachments.readyIds = ['doc-1', 'doc-2'];
		render(view(conversation()));
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'teamChat.SEND' }));
		});
		expect(mockActions.send).toHaveBeenCalledWith('c1', { body: '', attachmentIds: ['doc-1', 'doc-2'] }, { attachmentNames: 'plan.pdf\nshot.png' });
		mockAttachments.items = [];
		mockAttachments.readyIds = [];
	});

	it('takes files dropped on the timeline into the message', () => {
		render(view(conversation()));
		const timeline = screen.getByRole('log').parentElement as HTMLElement;
		const file = new File(['x'], 'notes.txt', { type: 'text/plain' });
		fireEvent.dragOver(timeline, { dataTransfer: { types: ['Files'], files: [file], dropEffect: 'none' } });
		expect(screen.getByText('entityFiles.DROP_HINT')).toBeTruthy();
		fireEvent.drop(timeline, { dataTransfer: { types: ['Files'], files: [file] } });
		expect(mockAttachments.add).toHaveBeenCalledWith([file]);
		expect(screen.queryByText('entityFiles.DROP_HINT')).toBeNull();
	});

	it('tells the others while something is typed, never for an empty field', () => {
		mockSignalTyping.mockClear();
		render(view(conversation()));
		const field = screen.getByRole('textbox');
		fireEvent.change(field, { target: { value: '   ' } });
		expect(mockSignalTyping).not.toHaveBeenCalled();
		fireEvent.change(field, { target: { value: 'h' } });
		expect(mockSignalTyping).toHaveBeenCalledTimes(1);
	});

	it('says who is typing under the timeline, in a polite live region', () => {
		mockTypists = [{ userId: BO_USER, employeeId: BO_EMPLOYEE, conversationId: 'c1', threadRootId: null, expiresAt: Date.now() + 6000 }];
		render(view(conversation()));
		const line = screen.getByTestId('chat-typing-line');
		expect(line.getAttribute('aria-live')).toBe('polite');
		expect(line.textContent).toBe('teamChat.TYPING_ONE:Bo Chen');
		mockTypists = [];
	});

	it('offers the files of the conversation in its header', () => {
		render(view(conversation()));
		expect(screen.getByRole('button', { name: 'teamChat.FILES' })).toBeTruthy();
	});

	it('keeps the settings of the conversation in its header', async () => {
		render(view(conversation({ state: state({ isFavorite: true }) })));
		const favourite = screen.getByRole('button', { name: 'teamChat.FAVORITE' });
		expect(favourite.getAttribute('aria-pressed')).toBe('true');
		await act(async () => {
			fireEvent.click(favourite);
		});
		expect(mockActions.setMemberState).toHaveBeenCalledWith('c1', { isFavorite: false });
		expect(screen.getByRole('button', { name: 'teamChat.NOTIFY_LEVEL' })).toBeTruthy();
		expect(screen.getByRole('button', { name: 'teamChat.MORE' })).toBeTruthy();
		expect(screen.getByRole('button', { name: 'teamChat.MEMBER_COUNT:4' }).textContent).toBe('4');
	});
});

describe('the virtual timeline', () => {
	const flag = process.env.NEXT_PUBLIC_CHAT_VIRTUAL_LIST_ENABLED;
	afterEach(() => {
		if (flag === undefined) delete process.env.NEXT_PUBLIC_CHAT_VIRTUAL_LIST_ENABLED;
		else process.env.NEXT_PUBLIC_CHAT_VIRTUAL_LIST_ENABLED = flag;
		mockTimeline.messages = [];
		mockTimeline.newestId = null;
	});

	it('renders the rows through the virtual list behind its flag, and every row without it', () => {
		mockTimeline.messages = [message('m1', at(10, 9)), message('m2', at(10, 10))];
		mockTimeline.newestId = 'm2';
		process.env.NEXT_PUBLIC_CHAT_VIRTUAL_LIST_ENABLED = 'true';
		const { container, unmount } = render(view(conversation()));
		expect(container.querySelector('[data-virtual-timeline]')).toBeTruthy();
		unmount();
		delete process.env.NEXT_PUBLIC_CHAT_VIRTUAL_LIST_ENABLED;
		const plain = render(view(conversation()));
		expect(plain.container.querySelector('[data-virtual-timeline]')).toBeNull();
		expect(plain.container.querySelectorAll('[data-message-id]')).toHaveLength(2);
	});
});
