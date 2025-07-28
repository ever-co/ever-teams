import { useTranslations } from 'next-intl';

export function InvitationExpiredMessageCard() {
	const t = useTranslations();

	return (
		<div className="w-full  bg-[#ffffff] dark:bg-[#25272D] p-4 rounded-2xl md:w-[35rem]">
			<div className="w-full px-8 flex flex-col gap-2 text-center">
				<h2 className="font-medium text-3xl">
					{t('pages.invite.acceptInvite.messages.INVALID_INVITATION.TITLE')}
				</h2>
				<p className=" text-lg text-gray-400">
					{t('pages.invite.acceptInvite.messages.INVALID_INVITATION.DESCRIPTION')}
				</p>
			</div>
		</div>
	);
}
