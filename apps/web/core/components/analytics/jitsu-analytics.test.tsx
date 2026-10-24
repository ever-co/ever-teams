/**
 * @jest-environment jsdom
 */
/**
 * Jitsu reads the page address and the referrer from the browser for every event, and the pages the auth e-mails open
 * carry a live credential there. The events are driven through the real SDK with a recording `fetch`, so the test
 * checks what would leave the browser rather than what the component passes in.
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { jitsuAnalytics } from '@jitsu/js';
import type { TUser } from '@/core/types/schemas';
import { JitsuAnalytics } from './jitsu-analytics';

/** The members of a sent event this suite reads. */
interface SentEvent {
	type: string;
	properties: { url?: string; search?: string };
	traits?: Record<string, unknown>;
	context: { page: { url?: string; search?: string; referrer?: string }; campaign?: Record<string, string> };
}

const sent: SentEvent[] = [];
const recordingFetch = jest.fn(async (_url: string, init?: { body?: string }) => {
	sent.push(JSON.parse(init?.body ?? '{}'));
	return { ok: true, status: 200, statusText: 'OK', text: async () => '{}' };
});
const mockAnalytics = jitsuAnalytics({
	host: 'https://jitsu.example',
	writeKey: 'key:secret',
	fetch: recordingFetch as unknown as typeof fetch
});
let mockPathname = '/';

jest.mock('@jitsu/jitsu-react', () => ({ useJitsu: () => ({ analytics: mockAnalytics }) }));
jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }));

const RESET_LINK = '/auth/reset-password?token=eyJ.live.token&utm_source=mail';
const SIGN_IN_LINK = 'https://app.ever.team/auth/passcode?email=ada%40example.com&code=AB12CD34';

function open(path: string, referrer = '') {
	window.history.pushState({}, '', path);
	mockPathname = new URL(window.location.href).pathname;
	Object.defineProperty(document, 'referrer', { value: referrer, configurable: true });
}

function eventsOfType(type: string) {
	return sent.filter((event) => event.type === type);
}

beforeEach(() => {
	sent.length = 0;
	recordingFetch.mockClear();
});

describe('JitsuAnalytics', () => {
	it('sends a page view of a reset link without the token, in the properties and the page context', async () => {
		open(RESET_LINK, SIGN_IN_LINK);

		render(<JitsuAnalytics user={null} />);
		await waitFor(() => expect(eventsOfType('page')).toHaveLength(1));

		const [page] = eventsOfType('page');
		const serialized = JSON.stringify(page);
		expect(serialized).not.toContain('eyJ.live.token');
		expect(serialized).not.toContain('AB12CD34');
		expect(serialized).not.toContain('ada%40example.com');
		expect(page.properties.url).toBe('http://localhost/auth/reset-password?token=redacted&utm_source=mail');
		expect(page.properties.search).toBe('?token=redacted&utm_source=mail');
		expect(page.context.page.url).toBe('http://localhost/auth/reset-password?token=redacted&utm_source=mail');
		expect(page.context.page.search).toBe('?token=redacted&utm_source=mail');
		expect(page.context.page.referrer).toBe('https://app.ever.team/auth/passcode?email=redacted&code=redacted');
		// The campaign Jitsu parses from the address is untouched.
		expect(page.context.campaign).toEqual({ source: 'mail' });
	});

	it('sends the identify call of a signed-in user without the token in its page context', async () => {
		open('/verify-email?email=ada%40example.com&token=live-verification-token');

		render(<JitsuAnalytics user={{ id: 'user-1', email: 'ada@example.com', name: 'Ada' } as unknown as TUser} />);
		await waitFor(() => expect(eventsOfType('identify')).toHaveLength(1));

		const [identify] = eventsOfType('identify');
		expect(JSON.stringify(identify)).not.toContain('live-verification-token');
		expect(identify.context.page.url).toBe('http://localhost/verify-email?email=redacted&token=redacted');
		expect(identify.traits).toEqual(expect.objectContaining({ email: 'ada@example.com', name: 'Ada' }));
	});

	it('sends an ordinary page as it is', async () => {
		open('/tasks?tab=2');

		render(<JitsuAnalytics user={null} />);
		await waitFor(() => expect(eventsOfType('page')).toHaveLength(1));

		const [page] = eventsOfType('page');
		expect(page.properties.url).toBe('http://localhost/tasks?tab=2');
		expect(page.context.page.search).toBe('?tab=2');
	});
});
