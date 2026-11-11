/** @jest-environment jsdom */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { ChatLinkPreviewCard, ChatPreviewLink } from '@/core/lib/utils/chat-link-preview';

const mockPreviews = jest.fn<ChatLinkPreviewCard[], [readonly ChatPreviewLink[]]>();

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values ? `${key}:${Object.values(values).map(String).join('|')}` : key
}));
jest.mock('@/core/hooks/chat/use-chat-link-previews', () => ({
	useChatLinkPreviews: (links: readonly ChatPreviewLink[]) => mockPreviews(links)
}));

import { MessageLinkPreviews } from './chat-link-preview';

const CARD: ChatLinkPreviewCard = {
	href: 'https://a.io/page#top',
	site: 'A site',
	title: 'The page',
	description: 'What the page is about'
};

beforeEach(() => mockPreviews.mockReset());

describe('MessageLinkPreviews', () => {
	it('asks for the links of the body, outside code', () => {
		mockPreviews.mockReturnValue([]);
		render(<MessageLinkPreviews body={'See https://a.io/page#top and `https://code.io`'} />);
		expect(mockPreviews).toHaveBeenCalledWith([{ href: 'https://a.io/page#top', url: 'https://a.io/page' }]);
	});

	it('renders nothing and asks nothing for a body without links', () => {
		const { container } = render(<MessageLinkPreviews body="No links here" />);
		expect(container.innerHTML).toBe('');
		expect(mockPreviews).not.toHaveBeenCalled();
	});

	it('renders the card as one link, named by the title and the site, described by the description', () => {
		mockPreviews.mockReturnValue([CARD]);
		render(<MessageLinkPreviews body="https://a.io/page#top" />);
		const link = screen.getByRole('link', { name: 'teamChat.LINK_PREVIEW_LABEL:The page|A site' });
		expect(link.getAttribute('href')).toBe('https://a.io/page#top');
		expect(link.getAttribute('target')).toBe('_blank');
		expect(link.getAttribute('rel')).toBe('noopener noreferrer nofollow');
		const describedBy = link.getAttribute('aria-describedby') as string;
		expect(document.getElementById(describedBy)?.textContent).toBe('What the page is about');
		expect(screen.getAllByRole('link')).toHaveLength(1);
	});

	it('draws no remote picture, so the browser of the reader never calls the linked site', () => {
		mockPreviews.mockReturnValue([CARD]);
		const { container } = render(<MessageLinkPreviews body="https://a.io/page#top" />);
		expect(container.querySelector('img')).toBeNull();
		expect(screen.getByText('A site')).toBeTruthy();
		expect(screen.getByText('The page')).toBeTruthy();
	});

	it('names a card without a title by its site', () => {
		mockPreviews.mockReturnValue([{ ...CARD, title: null }]);
		render(<MessageLinkPreviews body="https://a.io/page#top" />);
		expect(screen.getByRole('link', { name: 'teamChat.LINK_PREVIEW_SITE_LABEL:A site' })).toBeTruthy();
		expect(screen.queryByText('The page')).toBeNull();
	});
});
