'use client';

import { useCallback } from 'react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { toast } from 'sonner';
import { useTwoFactorStatus } from '@/core/hooks/auth/use-two-factor-settings';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { twoFactorService } from '@/core/services/client/api/auth/two-factor.service';

/**
 * An administrator's reset of a member's two-factor authentication, for a member who lost their phone and their
 * recovery codes. Offered only where the platform has two-factor authentication (the viewer's own state reads).
 */
export function useMemberTwoFactorReset() {
	const t = useTranslations();
	const { availability } = useTwoFactorStatus();
	const isOffered = availability === 'ready';

	const resetMember = useCallback(
		async (member: Readonly<{ userId: string | null; name: string }>) => {
			const { userId, name } = member;
			if (!userId) {
				return;
			}
			try {
				const { reset } = await twoFactorService.resetMember(userId);
				if (reset) {
					toast.success(t('settings.members.RESET_TWO_FACTOR_DONE', { name }));
					return;
				}
				toast.info(t('settings.members.RESET_TWO_FACTOR_NOTHING', { name }));
			} catch (error) {
				toast.error(t('settings.members.RESET_TWO_FACTOR_FAILED', { name }), {
					description: t(errorReasonKeyOf(error) as DottedLanguageObjectStringPaths)
				});
				throw error;
			}
		},
		[t]
	);

	return { isOffered, resetMember };
}
