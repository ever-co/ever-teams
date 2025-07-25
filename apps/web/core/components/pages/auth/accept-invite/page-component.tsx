'use client';

import { AuthLayout } from '@/core/components/layouts/default-layout';
import { useTranslations } from 'next-intl';

export function AcceptInvitePageComponent() {
	const t = useTranslations();

	return (
		<AuthLayout
			title={t('pages.invite.acceptInvite.ACCEPT_INVITATION_TO_TEAM', { team: 'Workout' })}
			description={t(t('pages.invite.acceptInvite.COMPLETE_REGISTRATION', { userEmail: 'user@example.com' }))}
		></AuthLayout>
	);
}
