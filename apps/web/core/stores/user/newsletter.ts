import { atom } from 'jotai';

/**
 * The user who subscribed to the newsletter in this page session (#5097), by id. Their opt-in card stays away even when
 * a refetch of the user answers without the subscription, as it does when the platform could not keep it.
 */
export const newsletterSubscriberIdAtom = atom<string | null>(null);
