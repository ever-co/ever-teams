/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';
import en from '@/locales/en.json';
import { TrackingOffNotice, TrackingOffPill } from './tracking-off-notice';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => {
		const messages: Record<string, string> = {
			'timer.TRACKING_DISABLED_MESSAGE':
				'Time tracking is turned off for you. An organization admin can turn it on.',
			'timer.TRACKING_OFF': 'Tracking off'
		};
		return messages[key] ?? key;
	}
}));

describe('the reason a member has no timer', () => {
	it('uses the existing message, which says who can turn tracking on', () => {
		expect(en.timer.TRACKING_DISABLED_MESSAGE).toBe(
			'Time tracking is turned off for you. An organization admin can turn it on.'
		);
		expect(en.timer.TRACKING_OFF).toBe('Tracking off');
	});

	it('reads in full where the timer pane would be', () => {
		render(<TrackingOffNotice />);

		expect(
			screen.getByText('Time tracking is turned off for you. An organization admin can turn it on.')
		).toBeTruthy();
	});

	it('reads as a short label in the top bar, the whole sentence kept for screen readers', () => {
		render(<TrackingOffPill />);

		const label = screen.getByText('Tracking off');
		expect(label.getAttribute('aria-hidden')).toBe('true');
		const reason = screen.getByText('Time tracking is turned off for you. An organization admin can turn it on.');
		expect(reason.className).toContain('sr-only');
	});
});
