/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ChangelogEntry } from '@/core/services/client/api/changelog.service';
import { getChangelogIcon } from './changelog-icon';
import { WhatsNewPanel } from './whats-new-panel';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, string>) =>
		values?.appName ? `${key}:${values.appName}` : key,
	useFormatter: () => ({
		dateTime: (date: Date, options: Intl.DateTimeFormatOptions) =>
			new Intl.DateTimeFormat('en-US', options).format(date)
	})
}));

jest.mock('@/core/constants/config/constants', () => ({ APP_NAME: 'Ever Teams' }));

// The sheet's dialog needs its root; these tests are about the body.
jest.mock('@/core/components/common/sheet', () => ({
	SheetHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
	SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>
}));

const entries: ChangelogEntry[] = [
	{
		id: 'new',
		icon: 'gift-outline',
		title: "What's new and About",
		date: '2026-11-08T00:00:00.000Z',
		content: 'Open the gift icon in the header.',
		learnMoreUrl: 'https://example.com/whats-new'
	},
	{
		id: 'old',
		icon: 'log-in-outline',
		title: 'Sign in with Ever ID',
		date: '2026-10-02T00:00:00.000Z',
		content: 'One account for every Ever app.',
		learnMoreUrl: null
	}
];

const renderPanel = (props: Partial<React.ComponentProps<typeof WhatsNewPanel>> = {}) =>
	render(
		<WhatsNewPanel
			entries={entries}
			isLoading={false}
			isError={false}
			onRetry={jest.fn()}
			seenAt={null}
			{...props}
		/>
	);

describe('WhatsNewPanel', () => {
	it('lists the entries newest first with their date, text and learn-more link', () => {
		renderPanel();

		const titles = screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent);
		expect(titles).toEqual(["What's new and About", 'Sign in with Ever ID']);
		expect(screen.getByText('Nov 8, 2026')).toBeTruthy();
		expect(screen.getByText('Open the gift icon in the header.')).toBeTruthy();
		const links = screen.getAllByRole('link', { name: /whatsNew.LEARN_MORE/ });
		expect(links).toHaveLength(1);
		expect(links[0].getAttribute('href')).toBe('https://example.com/whats-new');
		expect(links[0].getAttribute('rel')).toBe('noopener noreferrer');
	});

	it('marks as new only what came after the last look', () => {
		renderPanel({ seenAt: '2026-10-02T00:00:00.000Z' });

		expect(screen.getAllByText('whatsNew.NEW')).toHaveLength(1);
	});

	it('says so when there is nothing yet', () => {
		renderPanel({ entries: [] });

		expect(screen.getByText('whatsNew.EMPTY_TITLE')).toBeTruthy();
		expect(screen.queryByRole('heading', { level: 3 })).toBeNull();
	});

	it('offers a retry when the entries cannot be read', () => {
		const onRetry = jest.fn();
		renderPanel({ entries: [], isError: true, onRetry });

		fireEvent.click(screen.getByRole('button', { name: /whatsNew.RETRY/ }));
		expect(onRetry).toHaveBeenCalledTimes(1);
	});

	it('leads to the About page and closes the sheet on the way', () => {
		const onNavigate = jest.fn();
		renderPanel({ onNavigate });

		const about = screen.getByRole('link', { name: /whatsNew.ABOUT_LINK:Ever Teams/ });
		expect(about.getAttribute('href')).toBe('/about');
		fireEvent.click(about);
		expect(onNavigate).toHaveBeenCalledTimes(1);
	});
});

describe('getChangelogIcon', () => {
	it('maps Eva icon names, outline or fill, and falls back to the megaphone', () => {
		expect(getChangelogIcon('gift-outline')).toBe(getChangelogIcon('gift'));
		expect(getChangelogIcon('people-fill')).toBe(getChangelogIcon('people-outline'));
		expect(getChangelogIcon('unknown-thing')).toBe(getChangelogIcon(undefined));
		expect(getChangelogIcon('gift-outline')).not.toBe(getChangelogIcon(undefined));
	});
});
