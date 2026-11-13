/** @jest-environment jsdom */
/**
 * The conversation's More menu offers the channel's Integrations only when the view hands it an opener: for a channel
 * I may manage, whose webhooks the platform lists (never where it answers 404 or 403, see use-chat-webhooks.test.tsx).
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import {
	EChatConversationKind,
	EChatNotifyLevel,
	IChatConversationWithState
} from '@/core/types/interfaces/common/chat';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('@/core/hooks/chat/use-chat-conversations', () => ({
	useChatMembers: () => ({ members: [], isLoading: false })
}));
jest.mock('@/core/components/teams/people-avatars', () => ({ PersonAvatar: () => null }));
jest.mock('@/core/components/common/popover', () => {
	const Pass = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
	return { Popover: Pass, PopoverTrigger: Pass, PopoverContent: () => null };
});
jest.mock('@/core/components/common/tooltip', () => {
	const Pass = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
	return { Tooltip: Pass, TooltipTrigger: Pass, TooltipContent: () => null };
});
// The menus as plain lists: what they offer is the point here, not how they open.
jest.mock('@/core/components/common/dropdown-menu', () => {
	const Pass = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
	return {
		DropdownMenu: Pass,
		DropdownMenuTrigger: Pass,
		DropdownMenuContent: Pass,
		DropdownMenuLabel: Pass,
		DropdownMenuRadioGroup: Pass,
		DropdownMenuRadioItem: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
		DropdownMenuSeparator: () => <hr />,
		DropdownMenuItem: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => (
			<button type="button" role="menuitem" onClick={onClick}>
				{children}
			</button>
		)
	};
});
jest.mock('./conversation-glyph', () => ({ ConversationGlyph: () => null }));

import { ConversationHeader } from './conversation-header';

const CHANNEL: IChatConversationWithState = {
	id: 'c1',
	kind: EChatConversationKind.Channel,
	name: 'ops',
	visibility: 'public',
	position: 0,
	isDefault: false,
	messageCount: 3,
	memberCount: 4,
	state: {
		conversationId: 'c1',
		role: 'manager',
		notifyLevel: EChatNotifyLevel.All,
		isFavorite: false,
		unreadCount: 0,
		mentionCount: 0,
		lastReadMessageId: null,
		lastReadAt: null
	}
};

function renderHeader(onOpenIntegrations?: () => void) {
	return render(
		<ConversationHeader
			conversation={CHANNEL}
			title="ops"
			people={new Map()}
			meEmployeeId="e1"
			onToggleFavorite={jest.fn()}
			onNotify={jest.fn()}
			onCopyLink={jest.fn()}
			onLeave={jest.fn()}
			onOpenIntegrations={onOpenIntegrations}
		/>
	);
}

describe('ConversationHeader', () => {
	it('offers the Integrations of the channel when the view hands an opener, and opens them', () => {
		const open = jest.fn();
		renderHeader(open);

		fireEvent.click(screen.getByRole('menuitem', { name: 'teamChat.WEBHOOKS.TITLE' }));

		expect(open).toHaveBeenCalledTimes(1);
	});

	it('offers no Integrations otherwise (webhooks off, 403, not a manager)', () => {
		renderHeader();

		expect(screen.queryByRole('menuitem', { name: 'teamChat.WEBHOOKS.TITLE' })).toBeNull();
		expect(screen.getByRole('menuitem', { name: 'teamChat.COPY_LINK' })).toBeTruthy();
	});
});
