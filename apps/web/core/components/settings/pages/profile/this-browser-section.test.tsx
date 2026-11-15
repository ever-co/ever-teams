/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';

let mockEndsWithBrowser = false;
const mockSetSessionEndsWithBrowser = jest.fn((endsWithBrowser: boolean) => {
	mockEndsWithBrowser = endsWithBrowser;
});

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));
jest.mock('@/core/lib/helpers/cookies', () => ({
	sessionEndsWithBrowser: () => mockEndsWithBrowser,
	setSessionEndsWithBrowser: (endsWithBrowser: boolean) => mockSetSessionEndsWithBrowser(endsWithBrowser)
}));

import { ThisBrowserSection } from './this-browser-section';

beforeEach(() => {
	mockEndsWithBrowser = false;
	mockSetSessionEndsWithBrowser.mockClear();
});

describe('Settings > Profile > This browser (#5315)', () => {
	it('says how long the session lasts here, and keeps it after the browser closes by default', () => {
		render(<ThisBrowserSection />);

		expect(screen.getByText('settings.thisBrowser.DESCRIPTION')).toBeTruthy();
		expect(
			screen.getByRole('switch', { name: 'settings.thisBrowser.SIGN_OUT_ON_CLOSE' }).getAttribute('aria-checked')
		).toBe('false');
	});

	it('shows the choice this browser made before', () => {
		mockEndsWithBrowser = true;

		render(<ThisBrowserSection />);

		expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');
	});

	it('makes this browser forget the session when it closes, and keep it again', () => {
		render(<ThisBrowserSection />);
		const toggle = screen.getByRole('switch');

		fireEvent.click(toggle);

		expect(mockSetSessionEndsWithBrowser).toHaveBeenLastCalledWith(true);
		expect(toggle.getAttribute('aria-checked')).toBe('true');

		fireEvent.click(toggle);

		expect(mockSetSessionEndsWithBrowser).toHaveBeenLastCalledWith(false);
		expect(toggle.getAttribute('aria-checked')).toBe('false');
	});

	it('shows the choice another tab made once this tab comes back (Greptile on #5316)', () => {
		render(<ThisBrowserSection />);
		const toggle = screen.getByRole('switch');

		// Another tab of the browser turns it on: the cookie changes, and this tab is told nothing
		mockEndsWithBrowser = true;
		act(() => {
			window.dispatchEvent(new Event('focus'));
		});

		expect(toggle.getAttribute('aria-checked')).toBe('true');

		mockEndsWithBrowser = false;
		act(() => {
			document.dispatchEvent(new Event('visibilitychange'));
		});

		expect(toggle.getAttribute('aria-checked')).toBe('false');
	});
});
