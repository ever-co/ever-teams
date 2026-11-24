/** @jest-environment jsdom */
// cspell:ignore Seitenleiste ausblenden
import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import english from '@/locales/en.json';
import german from '@/locales/de.json';

jest.mock('next/navigation', () => ({ usePathname: () => '/' }));
jest.mock('@/core/hooks/common/use-mobile', () => ({ useIsMobile: () => false }));

import { SidebarProvider, SidebarRail, SidebarTrigger } from './sidebar';

function renderToggles(locale: string, messages: Record<string, unknown>) {
	render(
		<NextIntlClientProvider locale={locale} messages={messages}>
			<SidebarProvider>
				<SidebarTrigger />
				<SidebarRail />
			</SidebarProvider>
		</NextIntlClientProvider>
	);
}

const GERMAN_NAME = german.shortcuts.commands.sidebarToggle;

/**
 * The button and the rail that show or hide the sidebar carry no text: their name is all a screen reader says, and the
 * rail shows it as its tooltip. Both read "Toggle Sidebar" in every language of the app.
 */
describe('the name of the sidebar toggle', () => {
	it('is German on a German page, on the button and on the rail', () => {
		renderToggles('de', german);

		expect(GERMAN_NAME).toBe('Seitenleiste ein- oder ausblenden');
		expect(screen.getAllByRole('button', { name: GERMAN_NAME })).toHaveLength(2);
		expect(screen.queryByText('Toggle Sidebar')).toBeNull();
	});

	it('is the tooltip of the rail too', () => {
		renderToggles('de', german);

		const rail = document.querySelector('[data-sidebar="rail"]') as HTMLElement;

		expect(rail.getAttribute('title')).toBe(GERMAN_NAME);
	});

	it('reads as the keyboard shortcuts list does in English', () => {
		renderToggles('en', english);

		expect(screen.getAllByRole('button', { name: 'Show or hide the sidebar' })).toHaveLength(2);
	});
});
