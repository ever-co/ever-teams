/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ChatPerson } from '@/core/lib/utils/chat-format';
import { EChatConversationKind, EChatNotifyLevel, EChatVisibility, IChatConversationWithState, IChatMessage } from '@/core/types/interfaces/common/chat';
import { ChatThreadsView, ChatUnreadsView } from './chat-views';

jest.mock('next-intl', () => ({
	useLocale: () => 'en-US',
	useTranslations: () => (key: string, values?: Record<string, unknown>) => {
		const shown = Object.values(values ?? {});
		return shown.length ? `${key}:${shown.map(String).join(',')}` : key;
	}
}));
jest.mock('next/link', () => ({
	__esModule: true,
	default: ({ href, children, ...rest }: { href: string; children?: React.ReactNode }) => (
		<a href={href} {...rest}>
			{children}
		</a>
	)
}));

const ME = 'employee-me';
// A mention token carries an employee id, which is a UUID.
const BO: ChatPerson = { employeeId: '22222222-2222-4222-8222-222222222222', userId: 'user-bo', name: 'Bo Chen' };
const people = new Map<string, ChatPerson>([[BO.employeeId, BO]]);
const peopleByUser = new Map<string, ChatPerson>([['user-bo', BO]]);

function conversation(id: string, unreadCount: number, mentionCount: number, extra: Partial<IChatConversationWithState> = {}): IChatConversationWithState {
	return {
		id,
		kind: EChatConversationKind.Channel,
		name: id,
		visibility: EChatVisibility.Public,
		position: 0,
		isDefault: false,
		messageCount: 0,
		memberCount: 3,
		lastMessageAt: new Date(Date.now() - 5 * 60_000).toISOString(),
		state: { conversationId: id, role: 'member', notifyLevel: EChatNotifyLevel.All, isFavorite: false, unreadCount, mentionCount, lastReadMessageId: null, lastReadAt: null },
		...extra
	};
}

describe('the Unreads view', () => {
	const direct = conversation('dm', 1, 0, {
		kind: EChatConversationKind.Direct,
		name: null,
		members: [
			{ employeeId: ME, userId: 'user-me', role: 'member' },
			{ employeeId: BO.employeeId, userId: 'user-bo', role: 'member' }
		]
	});

	it('lists each unread conversation with what waits in it, and marks them all read', () => {
		const onMarkAllRead = jest.fn();
		render(<ChatUnreadsView conversations={[conversation('general', 4, 2), direct]} people={people} meEmployeeId={ME} isLoading={false} onMarkAllRead={onMarkAllRead} />);
		const general = screen.getByRole('link', { name: /general/ });
		expect(general.getAttribute('href')).toBe('/chat/general');
		expect(within(general).getByText('teamChat.UNREAD_COUNT:4')).toBeTruthy();
		expect(within(general).getByTitle('teamChat.MENTION_COUNT:2').textContent).toBe('2');
		expect(within(general).getByText('5 minutes ago')).toBeTruthy();
		// A direct conversation reads as the other person.
		expect(screen.getByRole('link', { name: /Bo Chen/ }).getAttribute('href')).toBe('/chat/dm');
		fireEvent.click(screen.getByRole('button', { name: /teamChat\.MARK_ALL_READ/ }));
		expect(onMarkAllRead).toHaveBeenCalledTimes(1);
	});

	it('says so when nothing is unread, with nothing left to mark', () => {
		render(<ChatUnreadsView conversations={[]} people={people} meEmployeeId={ME} isLoading={false} onMarkAllRead={jest.fn()} />);
		expect(screen.getByText('teamChat.NO_UNREADS_TITLE')).toBeTruthy();
		expect((screen.getByRole('button', { name: /teamChat\.MARK_ALL_READ/ }) as HTMLButtonElement).disabled).toBe(true);
	});

	it('gives a narrow screen the way back to the list', () => {
		const onBack = jest.fn();
		render(<ChatUnreadsView conversations={[]} people={people} meEmployeeId={ME} isLoading={false} onMarkAllRead={jest.fn()} onBack={onBack} />);
		fireEvent.click(screen.getByRole('button', { name: 'teamChat.BACK' }));
		expect(onBack).toHaveBeenCalledTimes(1);
	});
});

describe('the Threads view', () => {
	const general = conversation('c1', 0, 0, { name: 'general' });
	const root: IChatMessage & { unreadReplies: number } = {
		id: 'root-1',
		conversationId: 'c1',
		authorUserId: 'user-bo',
		authorEmployeeId: BO.employeeId,
		kind: 'message',
		body: `Shall we ship on Friday, <@${BO.employeeId}>?`,
		mentionsChannel: false,
		mentionsHere: false,
		alsoInConversation: false,
		replyCount: 6,
		lastReplyAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
		createdAt: new Date(Date.now() - 86_400_000).toISOString(),
		unreadReplies: 2
	};
	const shared = { conversations: new Map([['c1', general]]), conversationNames: new Map([['c1', 'general']]), people, peopleByUser, meEmployeeId: ME, onRetry: jest.fn() };

	it('lists each followed thread: where it is, how it started, how many replies and how many are new', () => {
		render(<ChatThreadsView threads={[root]} isLoading={false} isError={false} {...shared} />);
		const row = screen.getByRole('link');
		expect(row.getAttribute('href')).toBe('/chat/c1?thread=root-1');
		expect(within(row).getByText('#general')).toBeTruthy();
		// The preview reads the mention as a name, not as its token.
		expect(within(row).getByText(/Shall we ship on Friday/).textContent).toBe('Shall we ship on Friday, @Bo Chen?');
		expect(within(row).getByText('teamChat.REPLIES:6')).toBeTruthy();
		expect(within(row).getByText('teamChat.LAST_REPLY:2 hours ago')).toBeTruthy();
		expect(within(row).getByTitle('teamChat.UNREAD_REPLIES:2').textContent).toBe('2');
	});

	it('says so when no thread is followed, and offers a retry when the list could not load', () => {
		const { rerender } = render(<ChatThreadsView threads={[]} isLoading={false} isError={false} {...shared} />);
		expect(screen.getByText('teamChat.NO_THREADS_TITLE')).toBeTruthy();
		rerender(<ChatThreadsView threads={[]} isLoading={false} isError {...shared} />);
		expect(screen.queryByText('teamChat.NO_THREADS_TITLE')).toBeNull();
		fireEvent.click(screen.getByRole('button', { name: 'teamChat.RETRY' }));
		expect(shared.onRetry).toHaveBeenCalledTimes(1);
	});
});
