import { Button } from '@/core/components';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export function WorkspaceNotFoundMessageCard() {
	const t = useTranslations();
	return (
		<div className="mx-auto flex w-full max-w-sm flex-col gap-6 rounded-xl bg-card p-6 hairline-ring ring-border shadow-sm shadow-black/6.5">
			<div className="flex flex-col gap-2 w-full text-center">
				<h2 className="text-xl font-semibold text-balance">
					{t('pages.invite.acceptInvite.messages.WORKSPACE_NOT_EXIST.TITLE')}
				</h2>
				<p className="text-sm text-balance text-muted-foreground">
					{t('pages.invite.acceptInvite.messages.WORKSPACE_NOT_EXIST.DESCRIPTION')}
				</p>
			</div>

			<div className="flex flex-col gap-2 justify-center items-stretch w-full sm:flex-row sm:items-center">
				<Button variant="outline" asChild>
					<Link href={'/'}>{t('pages.invite.acceptInvite.buttons.RETURN_TO_DASHBOARD')}</Link>
				</Button>
				<Button asChild>
					<Link href={'/auth/signup'}>{t('pages.invite.acceptInvite.buttons.CREATE_NEW_WORKSPACE')}</Link>
				</Button>
			</div>
		</div>
	);
}
