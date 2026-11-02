import { useTranslations } from 'next-intl';

export function InvitationExpiredMessageCard() {
	const t = useTranslations();

	return (
		<div className="mx-auto w-full max-w-sm rounded-xl bg-card p-6 hairline-ring ring-border shadow-sm shadow-black/6.5">
			<div className="w-full flex flex-col gap-2 text-center">
				<h2 className="text-xl font-semibold text-balance">
					{t('pages.invite.acceptInvite.messages.INVALID_INVITATION.TITLE')}
				</h2>
				<p className="text-sm text-balance text-muted-foreground">
					{t('pages.invite.acceptInvite.messages.INVALID_INVITATION.DESCRIPTION')}
				</p>
			</div>
		</div>
	);
}
