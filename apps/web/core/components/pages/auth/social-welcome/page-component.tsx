'use client';
import { setAuthCookies } from '@/core/lib/helpers/index';
import { BackdropLoader } from '@/core/components/common/loader';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DEFAULT_APP_PATH } from '@/core/constants/config/constants';
import { readSocialSession, socialRefreshToken } from '@/core/lib/auth/social-session';

export default function Welcome() {
	const { data: session, update, status }: any = useSession();
	const router = useRouter();
	const t = useTranslations();
	// A social sign-up whose account waits for its e-mail confirmation (auth.ts jwt callback): no session to open
	const verifyEmail = session?.authCookie?.verifyEmail === true ? (session.authCookie.email as string) : null;

	useEffect(() => {
		// The session arrives after the first render (no initial session): wait for it, or a sign-up that waits for its
		// e-mail confirmation would be sent on before its notice shows
		if (status === 'loading' || verifyEmail !== null) return;
		const loadOAuthSession = () => {
			if (session) {
				const { access_token, organizationId, refresh_token, tenantId, teamId, userId } =
					readSocialSession(session) ?? {};
				if (access_token) {
					setAuthCookies({
						access_token: access_token,
						refresh_token: {
							token: socialRefreshToken(refresh_token) ?? ''
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
		router.replace(DEFAULT_APP_PATH);
	}, [router, session, status, update, verifyEmail]);

	if (verifyEmail !== null) {
		return (
			<p role="status" className="m-auto max-w-md p-6 text-center text-sm">
				{t('pages.auth.SIGNUP_VERIFY_EMAIL', { email: verifyEmail })}
			</p>
		);
	}

	return <BackdropLoader show={true} title={t('pages.authTeam.LOADING_TEXT')} />;
}
