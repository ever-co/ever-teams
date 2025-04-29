'use client';
import { setAuthCookies } from '@app/helpers';
import { BackdropLoader } from '@/core/components';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Welcome() {
	const { data: session, update }: any = useSession();
	const router = useRouter();
	const t = useTranslations();
	useEffect(() => {
		const loadOAuthSession = () => {
			if (session) {
				const { access_token, organizationId, refresh_token, tenantId, teamId, userId } = session.user;
				if (access_token) {
					setAuthCookies({
						access_token: access_token,
						refresh_token: {
							token: refresh_token
						},
						timezone: '',
						teamId,
						tenantId,
						organizationId,
						languageId: 'en',
						userId
					});
				}
			} else {
				return;
			}
		};
		loadOAuthSession();
		router.replace('/auth/passcode');
	}, [router, session, update]);

	return <BackdropLoader show={true} title={t('pages.authTeam.LOADING_TEXT')} />;
}
