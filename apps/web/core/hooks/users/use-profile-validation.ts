'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { activeTeamState } from '@/core/stores';
import { useUserQuery } from '../queries/user-user.query';

export type ProfileValidationState = 'loading' | 'valid' | 'not-found' | 'timeout' | 'unauthorized';

export interface ProfileValidationResult {
	state: ProfileValidationState;
	isValid: boolean;
	shouldShowError: boolean;
	shouldRedirect: boolean;
	errorMessage?: string;
	errorDescription?: string;
}

/**
 * Hook for validating profile access and handling edge cases
 * Centralizes all profile validation logic in one place
 */
export function useProfileValidation(memberId: string | null) {
	const { data: user } = useUserQuery();
	const activeTeam = useAtomValue(activeTeamState);
	const router = useRouter();
	const pathname = usePathname();
	const t = useTranslations();

	const [timeoutReached, setTimeoutReached] = useState(false);
	const [hasRedirected, setHasRedirected] = useState(false);

	// Check if current user is viewing their own profile
	const isAuthUser = useMemo(() => {
		return user?.employee?.userId === memberId;
	}, [user?.employee?.userId, memberId]);

	// Find member in current team
	const memberInTeam = useMemo(() => {
		if (!activeTeam?.members || !memberId) return null;
		return activeTeam.members.find((member) => member.employee?.userId === memberId) || null;
	}, [activeTeam?.members, memberId]);

	// Determine validation state
	const validationResult = useMemo((): ProfileValidationResult => {
		// No memberId provided
		if (!memberId) {
			return {
				state: 'not-found',
				isValid: false,
				shouldShowError: true,
				shouldRedirect: false,
				errorMessage: t('common.MEMBER') + ' ' + t('common.NOT_FOUND'),
				errorDescription: t('pages.profile.MEMBER_NOT_FOUND_MSG_1')
			};
		}

		// User not authenticated
		if (!user?.id) {
			return {
				state: 'unauthorized',
				isValid: false,
				shouldShowError: false,
				shouldRedirect: false
			};
		}

		// Viewing own profile (always valid)
		if (isAuthUser) {
			return {
				state: 'valid',
				isValid: true,
				shouldShowError: false,
				shouldRedirect: false
			};
		}

		// Team data not loaded yet
		if (!activeTeam?.members) {
			if (timeoutReached) {
				return {
					state: 'timeout',
					isValid: false,
					shouldShowError: true,
					shouldRedirect: false,
					errorMessage: t('common.MEMBER') + ' ' + t('common.NOT_FOUND'),
					errorDescription: t('pages.profile.MEMBER_NOT_FOUND_MSG_2')
				};
			}
			return {
				state: 'loading',
				isValid: false,
				shouldShowError: false,
				shouldRedirect: false
			};
		}

		// Member not found in current team
		if (!memberInTeam) {
			return {
				state: 'not-found',
				isValid: false,
				shouldShowError: true,
				shouldRedirect: false,
				errorMessage: t('common.MEMBER') + ' ' + t('common.NOT_FOUND'),
				errorDescription: t('pages.profile.MEMBER_NOT_FOUND_MSG_2')
			};
		}

		// Valid member
		return {
			state: 'valid',
			isValid: true,
			shouldShowError: false,
			shouldRedirect: false
		};
	}, [memberId, user?.id, isAuthUser, activeTeam?.members, memberInTeam, timeoutReached, t]);

	// Timeout effect
	useEffect(() => {
		if (validationResult.state === 'loading') {
			const timer = setTimeout(() => {
				setTimeoutReached(true);
			}, 5000);

			return () => clearTimeout(timer);
		} else {
			setTimeoutReached(false);
		}
	}, [validationResult.state]);

	// Handle team switching validation
	const validateTeamSwitch = useCallback(
		(newTeam: any) => {
			if (!pathname.includes('/profile/') || !memberId || isAuthUser) {
				return true; // No validation needed
			}

			const memberExistsInNewTeam = newTeam.members?.some((member: any) => member.employee?.userId === memberId);

			if (!memberExistsInNewTeam && !hasRedirected) {
				setHasRedirected(true);
				toast.info(t('common.MEMBER') + ' ' + t('common.NOT_FOUND'), {
					description: t('pages.profile.MEMBER_NOT_FOUND_MSG_2')
				});
				router.push('/');
				return false;
			}

			return true;
		},
		[pathname, memberId, isAuthUser, hasRedirected, t, router]
	);

	// Reset redirect flag when memberId changes
	useEffect(() => {
		setHasRedirected(false);
	}, [memberId]);

	return {
		...validationResult,
		memberInTeam,
		isAuthUser,
		validateTeamSwitch,
		// Compatibility with existing useUserProfilePage
		member: memberInTeam,
		userProfile: isAuthUser ? user : memberInTeam?.employee?.user
	};
}
