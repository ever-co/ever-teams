'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import {
	hasSubscribedToNewsletter,
	withNewsletterSubscription,
	type NewsletterSubscription
} from '@/core/lib/utils/newsletter-subscription';

/**
 * The newsletter opt-in of the signed-in user (#5097). It is offered only once the user is loaded, so it never flashes
 * for someone who subscribed, and never again after they subscribed: the platform keeps the subscription on the user.
 */
export function useNewsletterSubscription() {
	const { data: user } = useUserQuery();
	const queryClient = useQueryClient();
	const isOffered = !!user && !hasSubscribedToNewsletter(user);

	// The subscription the route kept on the platform goes straight into the signed-in user's cache: the card leaves
	// at once, with no read that a recent session check could answer with the user as they were.
	const remember = useCallback(
		(newsletter: NewsletterSubscription) => {
			queryClient.setQueryData(queryKeys.users.me, (current: unknown) =>
				withNewsletterSubscription(current, newsletter)
			);
		},
		[queryClient]
	);

	return { isOffered, remember };
}
