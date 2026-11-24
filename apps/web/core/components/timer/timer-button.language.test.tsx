/** @jest-environment jsdom */
// cspell:ignore starten stoppen Zurück Arbeit
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import english from '@/locales/en.json';
import german from '@/locales/de.json';
import { TimerButton } from './timer-button';

jest.mock('assets/svg', () => ({ TimerPlayIcon: () => null, TimerStopIcon: () => null }), { virtual: true });

function renderButton(running: boolean, locale: string, messages: Record<string, unknown>, label?: string) {
	render(
		<NextIntlClientProvider locale={locale} messages={messages}>
			<TimerButton running={running} disabled={false} label={label} />
		</NextIntlClientProvider>
	);
}

/**
 * The timer button has no text: its name is all a screen reader says. It was "Start timer" and "Stop timer" in
 * every language of the app.
 */
describe('the name of the timer button', () => {
	it('is German on a German page, to start', () => {
		renderButton(false, 'de', german);

		expect(screen.getByRole('button', { name: 'Timer starten' })).toBeTruthy();
		expect(screen.queryByRole('button', { name: 'Start timer' })).toBeNull();
	});

	it('is German on a German page, to stop', () => {
		renderButton(true, 'de', german);

		expect(screen.getByRole('button', { name: 'Timer stoppen' })).toBeTruthy();
	});

	it('stays Start timer and Stop timer in English', () => {
		renderButton(false, 'en', english);
		renderButton(true, 'en', english);

		expect(screen.getByRole('button', { name: 'Start timer' })).toBeTruthy();
		expect(screen.getByRole('button', { name: 'Stop timer' })).toBeTruthy();
	});

	it('keeps the name a caller gives, such as the return from a break', () => {
		renderButton(false, 'de', german, 'Zurück an die Arbeit');

		expect(screen.getByRole('button', { name: 'Zurück an die Arbeit' })).toBeTruthy();
	});
});
