/** Where the newsletter subscription is kept in the user's UI preferences on the platform. */
export const NEWSLETTER_UI_PREFERENCE = 'newsletter';

/**
 * The newsletter entry of a user's UI preferences: when Mailchimp accepted the address, and its list status, `pending`
 * while Mailchimp waits for the owner of an address that is not the user's verified one to confirm it.
 */
export type NewsletterSubscription = {
	subscribedAt: string;
	status: 'subscribed' | 'pending';
};

type WithUiPreferences = { uiPreferences?: Record<string, unknown> | null };

/** Whether the user subscribed to the newsletter, as the platform keeps it on the user (#5097). */
export function hasSubscribedToNewsletter(user: unknown): boolean {
	const preferences = (user as WithUiPreferences | null | undefined)?.uiPreferences;
	const newsletter = preferences?.[NEWSLETTER_UI_PREFERENCE] as { subscribedAt?: unknown } | null | undefined;
	return typeof newsletter?.subscribedAt === 'string' && newsletter.subscribedAt.length > 0;
}
