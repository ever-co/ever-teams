/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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
	description: 'What the page is about',
	image: { src: 'https://cdn.a.io/p.png', alt: 'A chart', ratio: 2 },
	icon: 'https://a.io/icon.png'
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

	it('draws the picture lazily, sized before it loads, without the referrer, with the alt the page gave', () => {
		mockPreviews.mockReturnValue([CARD]);
		const { container } = render(<MessageLinkPreviews body="https://a.io/page#top" />);
		const [icon, picture] = Array.from(container.querySelectorAll('img'));
		expect(icon.getAttribute('alt')).toBe('');
		expect(icon.getAttribute('referrerpolicy')).toBe('no-referrer');
		expect(picture.getAttribute('alt')).toBe('A chart');
		expect(picture.getAttribute('loading')).toBe('lazy');
		expect(picture.getAttribute('referrerpolicy')).toBe('no-referrer');
		expect(picture.getAttribute('width')).toBe('96');
		// The width and the height carry the proportions, so the box is held before the picture arrives.
		expect(picture.getAttribute('height')).toBe('48');
	});

	it('leaves out a picture that does not load, and names a card without a title by its site', () => {
		mockPreviews.mockReturnValue([{ ...CARD, title: null, icon: null }]);
		const { container } = render(<MessageLinkPreviews body="https://a.io/page#top" />);
		expect(screen.getByRole('link', { name: 'teamChat.LINK_PREVIEW_SITE_LABEL:A site' })).toBeTruthy();
		const picture = container.querySelector('img') as HTMLImageElement;
		fireEvent.error(picture);
		expect(container.querySelector('img')).toBeNull();
	});
});
