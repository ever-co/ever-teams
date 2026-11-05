import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Mail } from '@/core/components/icons';
import { Button } from '@/core/components/common/button';
import { AuthState } from '@/core/components/auth/kit/auth-state';
import { DEFAULT_APP_PATH } from '@/core/constants/config/constants';

export function InvitationExpiredMessageCard() {
	const t = useTranslations();

	return (
		<AuthState
			tone="warning"
			glyph={<Mail aria-hidden="true" />}
			title={t('pages.invite.acceptInvite.messages.INVALID_INVITATION.TITLE')}
			description={t('pages.invite.acceptInvite.messages.INVALID_INVITATION.DESCRIPTION')}
			actions={
				<Button asChild variant="outline" className="w-full max-sm:h-11">
					<Link href={DEFAULT_APP_PATH}>{t('auth.signUp.SIGN_IN')}</Link>
				</Button>
			}
		/>
	);
}
