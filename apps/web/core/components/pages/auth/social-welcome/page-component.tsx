'use client';
import { setAuthCookies } from '@/core/lib/helpers/index';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DEFAULT_APP_PATH } from '@/core/constants/config/constants';
import { navigateAfterSignIn } from '@/core/lib/auth/navigate-after-sign-in';
import { readSocialSession, socialRefreshToken } from '@/core/lib/auth/social-session';
import Link from 'next/link';
import { Mail } from '@/core/components/icons';
import { Button } from '@/core/components/common/button';
import { AuthLayout } from '@/core/components/layouts/default-layout/auth-layout';
import { AuthAddress, AuthState } from '@/core/components/auth/kit/auth-state';
import { InboxScene } from '@/core/components/auth/scenes/auth-scenes';

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
		// Whether the social session was opened here (its cookies set)
		const loadOAuthSession = (): boolean => {
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
					return true;
				}
			}
			return false;
		};
		// A sign-up that opened its session ends as every sign-in does: on the page set for it, the Board that started
		// it (board-return.ts), else the app
		if (loadOAuthSession()) {
			navigateAfterSignIn({ replace: true });
			return;
		}
		router.replace(DEFAULT_APP_PATH);
	}, [router, session, status, update, verifyEmail]);

	if (verifyEmail !== null) {
		return (
			<AuthLayout
				aside={
					<InboxScene
						title={t('auth.scene.INBOX_ACTIVATE_TITLE')}
						description={t('auth.scene.INBOX_ACTIVATE_TEXT')}
						email={verifyEmail}
						message="activate"
					/>
				}
			>
				<AuthState
					tone="brand"
					glyph={<Mail aria-hidden="true" />}
					title={t('auth.signUp.SENT_TITLE')}
					description={t('auth.signUp.SENT_TEXT')}
					actions={
						<Button asChild className="w-full max-sm:h-11">
							<Link href={DEFAULT_APP_PATH}>{t('auth.signUp.SIGN_IN')}</Link>
						</Button>
					}
				>
					<AuthAddress email={verifyEmail} />
				</AuthState>
			</AuthLayout>
		);
	}

	return (
		<AuthLayout>
			<AuthState tone="loading" title={t('auth.social.OPENING')} description={t('auth.social.OPENING_TEXT')} />
		</AuthLayout>
	);
}
