'use client';

import { useQuery } from '@tanstack/react-query';
import {
	asksForEmailVerification,
	isEmailVerificationSatisfied,
	type EmailVerificationState
} from '@/core/lib/auth/email-verification';
import { queryKeys } from '@/core/query/keys';
import { emailVerificationService } from '@/core/services/client/api/users/emails/email-verification.service';
import type { TUser } from '@/core/types/schemas';

type SignedInUser = Pick<TUser, 'id' | 'isEmailVerified' | 'lastOrganizationId'> | null | undefined;

/** The deployment's verification switch changes by hand, rarely: read as seldom as the user is. */
const STATUS_STALE_TIME_MS = 1000 * 60 * 15;

/**
 * Gauzy's answer on the signed-in user's address verification (`null` where the deployment verifies no address). It is
 * asked only while the user's address is not verified: a verified address needs no call.
 */
export function useEmailVerificationStatus(user: SignedInUser): EmailVerificationState {
	const hasUser = Boolean(user?.id);
	const isUnverified = hasUser && !user?.isEmailVerified;
	const query = useQuery({
		queryKey: queryKeys.users.emailVerificationStatus(user?.id, user?.lastOrganizationId),
		queryFn: () => emailVerificationService.getVerificationStatus(),
		enabled: isUnverified,
		staleTime: STATUS_STALE_TIME_MS
	});

	return query.data;
}

/**
 * Whether the person may invite, create a team, a project or a task and track time: their address is verified, or the
 * deployment verifies no address (see isEmailVerificationSatisfied).
 */
export function useIsEmailVerificationSatisfied(user: SignedInUser): boolean {
	const state = useEmailVerificationStatus(user);

	return isEmailVerificationSatisfied(user, state);
}

/** Whether to ask the person to verify their address (see asksForEmailVerification). */
export function useAsksForEmailVerification(user: SignedInUser): boolean {
	const state = useEmailVerificationStatus(user);

	return asksForEmailVerification(user, state);
}
