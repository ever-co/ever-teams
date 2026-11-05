import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Building } from '@/core/components/icons';
import { Button } from '@/core/components/common/button';
import { AuthState } from '@/core/components/auth/kit/auth-state';

export function WorkspaceNotFoundMessageCard() {
	const t = useTranslations();
	return (
		<AuthState
			tone="warning"
			glyph={<Building aria-hidden="true" />}
			title={t('pages.invite.acceptInvite.messages.WORKSPACE_NOT_EXIST.TITLE')}
			description={t('pages.invite.acceptInvite.messages.WORKSPACE_NOT_EXIST.DESCRIPTION')}
			actions={
				<>
					<Button asChild className="w-full max-sm:h-11">
						<Link href="/auth/signup">{t('pages.invite.acceptInvite.buttons.CREATE_NEW_WORKSPACE')}</Link>
					</Button>
					<Button variant="outline" asChild className="w-full max-sm:h-11">
						<Link href="/">{t('pages.invite.acceptInvite.buttons.RETURN_TO_DASHBOARD')}</Link>
					</Button>
				</>
			}
		/>
	);
}
