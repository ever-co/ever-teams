import { Button } from '@/core/components';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export function WorkspaceNotFoundMessageCard() {
	const t = useTranslations();
	return (
		<div className="w-full flex flex-col gap-4 bg-[#ffffff] dark:bg-[#25272D] p-6 rounded-2xl md:w-[35rem]">
			<div className="w-full px-4 flex flex-col gap-2 text-center">
				<h2 className="font-medium text-3xl">
					{t('pages.invite.acceptInvite.messages.WORKSPACE_NOT_EXIST.TITLE')}
				</h2>
				<p className=" text-lg text-gray-400">
					{t('pages.invite.acceptInvite.messages.WORKSPACE_NOT_EXIST.DESCRIPTION')}
				</p>
			</div>

			<div className="w-full flex-col md:flex-row flex items-center justify-center gap-8">
				<Button variant="outline">
					<Link href={'/'}>{t('pages.invite.acceptInvite.buttons.RETURN_TO_DASHBOARD')}</Link>
				</Button>
				<Button>
					<Link href={'/auth/team'}>{t('pages.invite.acceptInvite.buttons.CREATE_NEW_WORKSPACE')}</Link>
				</Button>
			</div>
		</div>
	);
}
