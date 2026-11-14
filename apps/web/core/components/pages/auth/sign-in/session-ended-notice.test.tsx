/** @jest-environment jsdom */
/**
 * The app ends a session that cannot go on (the API refuses its refresh token, or the session's cookies are gone) and
 * sends the tab to the sign-in page. That page said nothing about it: the person found a sign-in form where their
 * work was, with no reason given.
 *
 * The sign-out is the app's own here (handle-unauthorized.ts); only the page's address is a stand-in.
 */
import { cleanup, render, screen } from '@testing-library/react';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
// What the sign-out logs and unsubscribes goes to the app's own routes
jest.mock('@/core/services/logs/logger-client', () => ({ sendLogToAPI: jest.fn(async () => undefined) }));
jest.mock('@/core/lib/utils/web-push', () => ({ unsubscribeThisBrowserPush: jest.fn(async () => undefined) }));

import { handleUnauthorized } from '@/core/lib/auth/handle-unauthorized';
import { clearSessionEndedNotice } from '@/core/lib/auth/session-ended-notice';
import { DisconnectionReason } from '@/core/types/enums/disconnection-reason';
import { openFakeGauzyPage, type FakeGauzyPage } from '@/test/auth/fake-gauzy-page';
import { SessionEndedNotice } from './session-ended-notice';

let page: FakeGauzyPage;

beforeEach(() => {
	page = openFakeGauzyPage([]);
});

afterEach(() => {
	cleanup();
	clearSessionEndedNotice();
	page.close();
});

describe('the sign-in page, after the app ended the session', () => {
	it('says the session ended and asks to sign in again', async () => {
		await handleUnauthorized(DisconnectionReason.REFRESH_TOKEN_EXPIRED);
		expect(page.sentToSignIn).toHaveBeenCalledTimes(1);

		render(<SessionEndedNotice />);

		const notice = screen.getByRole('alert');
		expect(notice.textContent).toContain('auth.sessionEnded.TITLE');
		expect(notice.textContent).toContain('auth.sessionEnded.TEXT');
	});

	it('says nothing to a person the app did not sign out', () => {
		const { container } = render(<SessionEndedNotice />);

		expect(container.firstChild).toBeNull();
	});

	it('says nothing when the session ended on a page that keeps the person where they are', async () => {
		// A password reset link opened with an old session in the browser: the page stays, no sign-in page follows
		page.openAt('/auth/reset-password');

		await handleUnauthorized(DisconnectionReason.REFRESH_TOKEN_EXPIRED);
		expect(page.sentToSignIn).not.toHaveBeenCalled();

		const { container } = render(<SessionEndedNotice />);
		expect(container.firstChild).toBeNull();
	});
});
