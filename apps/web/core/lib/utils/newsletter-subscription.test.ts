import { hasSubscribedToNewsletter } from './newsletter-subscription';

describe('the newsletter subscription kept on the user (#5097)', () => {
	const subscription = { subscribedAt: '2026-11-12T10:00:00.000Z', status: 'subscribed' as const };

	it('reads a user who subscribed, and no one else', () => {
		expect(hasSubscribedToNewsletter({ uiPreferences: { newsletter: subscription } })).toBe(true);
		expect(hasSubscribedToNewsletter({ uiPreferences: { keyboard: { bindings: {} } } })).toBe(false);
		expect(hasSubscribedToNewsletter({ uiPreferences: null })).toBe(false);
		expect(hasSubscribedToNewsletter({})).toBe(false);
		expect(hasSubscribedToNewsletter(undefined)).toBe(false);
	});

	it('does not read a malformed entry as a subscription', () => {
		expect(hasSubscribedToNewsletter({ uiPreferences: { newsletter: { subscribedAt: '' } } })).toBe(false);
		expect(hasSubscribedToNewsletter({ uiPreferences: { newsletter: { status: 'subscribed' } } })).toBe(false);
		expect(hasSubscribedToNewsletter({ uiPreferences: { newsletter: null } })).toBe(false);
	});
});
