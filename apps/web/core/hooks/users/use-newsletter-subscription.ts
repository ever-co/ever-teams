'use client';

import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { hasSubscribedToNewsletter } from '@/core/lib/utils/newsletter-subscription';
import { newsletterSubscriberIdAtom } from '@/core/stores';

/**
 * The newsletter opt-in of the signed-in user (#5097). It is offered only once the user is loaded, so it never flashes
 * for someone who subscribed, and never again after they subscribed: the platform keeps the subscription on the user.
 */
export function useNewsletterSubscription() {
	const { data: user } = useUserQuery();
	const [subscriberId, setSubscriberId] = useAtom(newsletterSubscriberIdAtom);
	const userId = user?.id;
	// A subscription made on this page counts whatever the latest read of the user says: when the platform could not
	// keep it, every refetch of the user answers without it
	const subscribedOnThisPage = !!userId && userId === subscriberId;
	const isOffered = !!user && !subscribedOnThisPage && !hasSubscribedToNewsletter(user);

	// The card leaves at once, with no read of the user
	const remember = useCallback(() => {
		if (userId) {
			setSubscriberId(userId);
		}
	}, [setSubscriberId, userId]);

	return { isOffered, remember };
}
