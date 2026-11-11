/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import {
	EChatConversationKind,
	EChatNotifyLevel,
	type IChatConversationWithState
} from '@/core/types/interfaces/common/chat';

const ME = 'employee-me';
const ANA = 'employee-ana';
const BO = 'employee-bo';

const mockPush = jest.fn();
const mockDirect = jest.fn(async () => ({ id: 'new-direct' }));
const mockPeople = {
	list: [
		{ employeeId: ME, name: 'Me Myself' },
		{ employeeId: ANA, name: 'Ana Silva' },
		{ employeeId: BO, name: 'Bo Chen' }
	],
	byEmployee: new Map([
		[ME, { employeeId: ME, name: 'Me Myself' }],
		[ANA, { employeeId: ANA, name: 'Ana Silva' }],
		[BO, { employeeId: BO, name: 'Bo Chen' }]
	]),
	byUser: new Map()
};
let mockConversations: IChatConversationWithState[] = [];

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values?.name ? `${key}:${String(values.name)}` : key
}));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));
jest.mock('@/core/components/common/command', () => ({
	CommandGroup: ({ heading, children }: { heading: string; children: React.ReactNode }) => (
		<section aria-label={heading}>{children}</section>
	),
	CommandItem: ({
		value,
		onSelect,
		children
	}: {
		value: string;
		onSelect: () => void;
		children: React.ReactNode;
	}) => (
		<button type="button" data-value={value} onClick={onSelect}>
			{children}
		</button>
	)
}));
jest.mock('@/core/components/pages/chat/conversation-glyph', () => ({
	ConversationGlyph: ({ status }: { status?: string | null }) => (
		<span data-testid="glyph" data-status={status ?? ''} />
	)
}));
jest.mock('@/core/components/pages/chat/chat-presence-dot', () => ({
	PresenceDot: ({ status }: { status: string }) => <span data-testid="dot">{status}</span>
}));
jest.mock('@/core/components/teams/people-avatars', () => ({ PersonAvatar: () => <span /> }));
jest.mock('@/core/hooks/chat/use-chat-actions', () => ({ useChatActions: () => ({ direct: mockDirect }) }));
jest.mock('@/core/hooks/chat/use-chat-conversations', () => ({
	useChatConversations: () => ({ conversations: mockConversations })
}));
jest.mock('@/core/hooks/chat/use-chat-presence', () => ({ useChatPresence: () => new Map([[ANA, 'running']]) }));
jest.mock('@/core/hooks/chat/use-chat-scope', () => ({
	useChatPeople: () => mockPeople,
	useChatScope: () => ({ tenantId: 't', organizationId: 'o', userId: 'u', employeeId: ME })
}));

import { PaletteChatResults } from './palette-chat-results';

function conversation(id: string, extra: Partial<IChatConversationWithState> = {}): IChatConversationWithState {
	return {
		id,
		kind: EChatConversationKind.Channel,
		name: id,
		visibility: 'public',
		position: 0,
		isDefault: false,
		messageCount: 0,
		memberCount: 2,
		state: null,
		...extra
	};
}

const withAna = conversation('d-ana', {
	kind: EChatConversationKind.Direct,
	name: null,
	members: [
		{ employeeId: ME, userId: 'u', role: 'member' },
		{ employeeId: ANA, userId: 'u-ana', role: 'member' }
	]
});

const unread = {
	conversationId: '',
	role: 'member',
	notifyLevel: EChatNotifyLevel.All,
	isFavorite: false,
	unreadCount: 3,
	mentionCount: 0,
	lastReadMessageId: null,
	lastReadAt: null
};

beforeEach(() => {
	mockConversations = [conversation('general'), conversation('launch', { state: unread }), withAna];
});

describe('PaletteChatResults', () => {
	it('lists a few conversations, the unread first, and no people before anything is typed', () => {
		render(<PaletteChatResults search="" onDone={jest.fn()} />);
		const rows = screen.getAllByRole('button').map((row) => row.getAttribute('data-value'));
		expect(rows).toEqual(['#launch launch', '#general general', 'Ana Silva d-ana']);
		expect(screen.queryByRole('region', { name: 'commandPalette.results.people' })).toBeNull();
		// The other person's dot on a direct conversation.
		expect(screen.getAllByTestId('glyph')[2].getAttribute('data-status')).toBe('running');
		expect(screen.getByText('3')).toBeTruthy();
	});

	it('opens a picked conversation and closes the palette', () => {
		const onDone = jest.fn();
		render(<PaletteChatResults search="" onDone={onDone} />);
		fireEvent.click(screen.getByText('general'));
		expect(onDone).toHaveBeenCalled();
		expect(mockPush).toHaveBeenCalledWith('/chat/general');
	});

	it('offers the people with no direct conversation once something is typed, and writes to one', async () => {
		const onDone = jest.fn();
		render(<PaletteChatResults search="bo" onDone={onDone} />);
		expect(screen.getByRole('region', { name: 'commandPalette.results.people' })).toBeTruthy();
		const people = screen
			.getAllByRole('button')
			.filter((row) => row.textContent?.startsWith('commandPalette.results.messagePerson'));
		expect(people.map((row) => row.textContent)).toEqual(['commandPalette.results.messagePerson:Bo Chen']);
		await act(async () => {
			fireEvent.click(people[0]);
		});
		expect(onDone).toHaveBeenCalled();
		expect(mockDirect).toHaveBeenCalledWith([BO]);
		expect(mockPush).toHaveBeenCalledWith('/chat/new-direct');
	});

	it('shows nothing without conversations or people to offer', () => {
		mockConversations = [];
		const { container } = render(<PaletteChatResults search="" onDone={jest.fn()} />);
		expect(container.textContent).toBe('');
	});
});
