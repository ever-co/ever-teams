/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ChatPerson } from '@/core/lib/utils/chat-format';
import { EChatConversationKind, EChatNotifyLevel, EChatVisibility, IChatCategory, IChatConversationWithState, IChatMemberState } from '@/core/types/interfaces/common/chat';
import { ConversationList, ConversationListProps } from './conversation-list';

const mockPush = jest.fn();

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: { count?: number }) => (values?.count === undefined ? key : `${key}:${values.count}`)
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('next/link', () => ({
	__esModule: true,
	default: ({ href, children, ...rest }: { href: string; children?: React.ReactNode }) => (
		<a href={href} {...rest}>
			{children}
		</a>
	)
}));

const ME = 'employee-me';
const BO = 'employee-bo';
const people = new Map<string, ChatPerson>([
	[ME, { employeeId: ME, name: 'Me Myself' }],
	[BO, { employeeId: BO, name: 'Bo Chen' }]
]);

function state(extra: Partial<IChatMemberState> = {}): IChatMemberState {
	return { conversationId: '', role: 'member', notifyLevel: EChatNotifyLevel.All, isFavorite: false, unreadCount: 0, mentionCount: 0, lastReadMessageId: null, lastReadAt: null, ...extra };
}

function channel(name: string, extra: Partial<IChatConversationWithState> = {}): IChatConversationWithState {
	return { id: name, kind: EChatConversationKind.Channel, name, visibility: EChatVisibility.Public, position: 0, isDefault: false, messageCount: 0, memberCount: 3, state: state(), ...extra };
}

const categories: IChatCategory[] = [{ id: 'cat-projects', name: 'Projects', position: 1 }];
const conversations: IChatConversationWithState[] = [
	channel('general', { state: state({ unreadCount: 4 }) }),
	channel('random'),
	channel('secret', { visibility: EChatVisibility.Private, state: state({ unreadCount: 2, mentionCount: 1 }) }),
	channel('noisy', { state: state({ unreadCount: 9, notifyLevel: EChatNotifyLevel.Muted }) }),
	channel('launch', { categoryId: 'cat-projects' }),
	{
		...channel('dm-bo', { kind: EChatConversationKind.Direct, name: null }),
		members: [
			{ employeeId: ME, userId: 'u-me', role: 'member' },
			{ employeeId: BO, userId: 'u-bo', role: 'member' }
		]
	}
];

function renderList(props: Partial<ConversationListProps> = {}) {
	const handlers = { onNewChannel: jest.fn(), onNewDirect: jest.fn(), onBrowse: jest.fn(), onRetry: jest.fn() };
	render(
		<ConversationList
			conversations={conversations}
			categories={categories}
			people={people}
			meEmployeeId={ME}
			currentId="random"
			view="conversation"
			unreadCount={3}
			threadsUnread={0}
			{...handlers}
			{...props}
		/>
	);
	return handlers;
}

const row = (name: string) => screen.getByRole('link', { name: new RegExp(name) });
const rowNames = () =>
	screen
		.queryAllByRole('link')
		.map((link) => link.getAttribute('href'))
		.filter((href): href is string => !!href && href.startsWith('/chat/') && !['/chat/unreads', '/chat/threads'].includes(href))
		.map((href) => href.replace('/chat/', ''));

beforeEach(() => mockPush.mockClear());

describe('the sections', () => {
	it('lists the categories, the other channels and the direct messages, each with its count', () => {
		renderList();
		expect(rowNames()).toEqual(['launch', 'general', 'noisy', 'random', 'secret', 'dm-bo']);
		expect(within(screen.getByRole('button', { name: /Projects/ })).getByText('1')).toBeTruthy();
		expect(within(screen.getByRole('button', { name: /teamChat\.CHANNELS/ })).getByText('4')).toBeTruthy();
		// A direct conversation reads as the other person.
		expect(row('Bo Chen').getAttribute('href')).toBe('/chat/dm-bo');
	});

	it('marks the open conversation, and Unreads and Threads with their counts', () => {
		renderList({ threadsUnread: 2 });
		expect(row('random').getAttribute('aria-current')).toBe('page');
		expect(row('general').getAttribute('aria-current')).toBeNull();
		expect(within(row('teamChat.UNREADS')).getByText('3')).toBeTruthy();
		expect(within(row('teamChat.THREADS')).getByText('2')).toBeTruthy();
	});

	it('counts what waits: unread messages, mentions first, nothing for a muted conversation', () => {
		renderList();
		expect(within(row('general')).getByText('4')).toBeTruthy();
		// A mention shows its own count (and says what it is), not the unread count beside it.
		expect(within(row('secret')).getByTitle('teamChat.MENTION_COUNT:1').textContent).toBe('1');
		expect(within(row('secret')).queryByText('2')).toBeNull();
		expect(within(row('noisy')).queryByText('9')).toBeNull();
		expect(row('general').className).toContain('font-semibold');
		expect(row('noisy').className).not.toContain('font-semibold');
	});

	it('folds a section down to the conversations that need the reader', () => {
		renderList();
		const header = screen.getByRole('button', { name: /teamChat\.CHANNELS/ });
		expect(header.getAttribute('aria-expanded')).toBe('true');
		fireEvent.click(header);
		expect(header.getAttribute('aria-expanded')).toBe('false');
		// The unread ones and the open one stay; the muted one folds away, whatever waits in it.
		expect(rowNames()).toEqual(['launch', 'general', 'random', 'secret', 'dm-bo']);
		fireEvent.click(header);
		expect(rowNames()).toContain('noisy');
	});

	it('offers the actions of the pane', () => {
		const handlers = renderList();
		fireEvent.click(screen.getAllByRole('button', { name: 'teamChat.NEW_MESSAGE' })[0]);
		expect(handlers.onNewDirect).toHaveBeenCalledTimes(1);
		fireEvent.click(screen.getByRole('button', { name: 'teamChat.BROWSE_CHANNELS' }));
		expect(handlers.onBrowse).toHaveBeenCalledTimes(1);
		fireEvent.click(screen.getByRole('button', { name: 'teamChat.NEW_CHANNEL' }));
		expect(handlers.onNewChannel).toHaveBeenCalledTimes(1);
	});

	it('tells the page which row was picked, the open one included', () => {
		const onNavigate = jest.fn();
		renderList({ onNavigate });
		fireEvent.click(row('random'));
		expect(onNavigate).toHaveBeenLastCalledWith('/chat/random');
		fireEvent.click(row('teamChat.UNREADS'));
		expect(onNavigate).toHaveBeenLastCalledWith('/chat/unreads');
	});

	it('says so when a section is empty, with the way to start', () => {
		const handlers = renderList({ conversations: [], categories: [] });
		expect(screen.getByText('teamChat.NO_CHANNELS')).toBeTruthy();
		expect(screen.getByText('teamChat.NO_DIRECT')).toBeTruthy();
		// The header's button, and the row under the empty section.
		const starts = screen.getAllByRole('button', { name: 'teamChat.NEW_CHANNEL' });
		fireEvent.click(starts[starts.length - 1]);
		expect(handlers.onNewChannel).toHaveBeenCalledTimes(1);
	});
});

describe('the filter', () => {
	const filter = () => screen.getByRole('textbox', { name: 'teamChat.SEARCH_CONVERSATIONS' }) as HTMLInputElement;

	it('narrows the list to the names that match, channels and people alike', () => {
		renderList();
		fireEvent.change(filter(), { target: { value: 'o' } });
		expect(rowNames()).toEqual(['random', 'noisy', 'dm-bo']);
		fireEvent.change(filter(), { target: { value: 'bo' } });
		expect(rowNames()).toEqual(['dm-bo']);
		fireEvent.change(filter(), { target: { value: 'zzz' } });
		expect(rowNames()).toEqual([]);
		expect(screen.getByText('teamChat.NO_CONVERSATIONS')).toBeTruthy();
	});

	it('clears on Escape and with its button, and leaves Shift+Escape alone', () => {
		renderList();
		fireEvent.change(filter(), { target: { value: 'gen' } });
		fireEvent.keyDown(filter(), { key: 'Escape', shiftKey: true });
		expect(filter().value).toBe('gen');
		fireEvent.keyDown(filter(), { key: 'Escape' });
		expect(filter().value).toBe('');
		expect(rowNames()).toHaveLength(conversations.length);
		fireEvent.change(filter(), { target: { value: 'gen' } });
		fireEvent.click(screen.getByRole('button', { name: 'teamChat.CLEAR_SEARCH' }));
		expect(filter().value).toBe('');
	});

	it('opens the first match on Enter', () => {
		renderList();
		fireEvent.change(filter(), { target: { value: 'sec' } });
		fireEvent.keyDown(filter(), { key: 'Enter' });
		expect(mockPush).toHaveBeenCalledWith('/chat/secret');
		expect(filter().value).toBe('');
	});
});

describe('loading and failing', () => {
	it('keeps its header and shows no section while the list loads', () => {
		renderList({ conversations: [], categories: [], isLoading: true });
		expect(screen.getByText('teamChat.TITLE')).toBeTruthy();
		expect(screen.queryByRole('button', { name: /teamChat\.CHANNELS/ })).toBeNull();
		expect(screen.queryByText('teamChat.NO_CHANNELS')).toBeNull();
	});

	it('offers to try again when the list could not load', () => {
		const handlers = renderList({ conversations: [], categories: [], isError: true });
		expect(screen.getByRole('alert').textContent).toContain('teamChat.LOAD_ERROR');
		fireEvent.click(screen.getByRole('button', { name: 'teamChat.RETRY' }));
		expect(handlers.onRetry).toHaveBeenCalledTimes(1);
	});
});
