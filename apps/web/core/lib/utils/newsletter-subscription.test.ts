import { hasSubscribedToNewsletter, withNewsletterSubscription } from './newsletter-subscription';

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

	it("adds the subscription to the user's preferences and keeps their other features", () => {
		const user = { id: 'user-1', uiPreferences: { keyboard: { bindings: { save: 'mod+s' } } } };

		expect(withNewsletterSubscription(user, subscription)).toEqual({
			id: 'user-1',
			uiPreferences: { keyboard: { bindings: { save: 'mod+s' } }, newsletter: subscription }
		});
		expect(withNewsletterSubscription({ id: 'user-2' }, subscription)).toEqual({
			id: 'user-2',
			uiPreferences: { newsletter: subscription }
		});
	});

	it('leaves a missing user as it is', () => {
		expect(withNewsletterSubscription(undefined, subscription)).toBeUndefined();
		expect(withNewsletterSubscription(null, subscription)).toBeNull();
	});
});
