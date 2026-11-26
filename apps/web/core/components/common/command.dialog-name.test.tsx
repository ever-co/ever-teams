/** @jest-environment jsdom */
// cspell:ignore Befehl
import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import english from '@/locales/en.json';
import german from '@/locales/de.json';
import { CommandDialog } from './command';

function renderPalette(locale: string, messages: Record<string, unknown>) {
	render(
		<NextIntlClientProvider locale={locale} messages={messages}>
			<CommandDialog open>
				<span>content</span>
			</CommandDialog>
		</NextIntlClientProvider>
	);
}

/**
 * The command palette shows no title: a screen reader announces the dialog by its hidden one, which read
 * "Command Dialog" in every language of the app.
 */
describe('the name of the command palette', () => {
	it('is German on a German page: the name of the button that opens it', () => {
		renderPalette('de', german);

		expect(screen.getByRole('dialog', { name: 'Befehl' })).toBeTruthy();
		expect(screen.queryByText('Command Dialog')).toBeNull();
	});

	it('is Command in English', () => {
		renderPalette('en', english);

		expect(screen.getByRole('dialog', { name: 'Command' })).toBeTruthy();
	});
});
