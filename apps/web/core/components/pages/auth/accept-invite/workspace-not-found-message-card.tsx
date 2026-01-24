import { Button } from '@/core/components';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export function WorkspaceNotFoundMessageCard() {
	const t = useTranslations();
	return (
		<div className="w-full flex flex-col gap-4 bg-[#ffffff] dark:bg-[#25272D] p-6 rounded-2xl md:w-[35rem]">
			<div className="flex flex-col gap-2 px-4 w-full text-center">
				<h2 className="text-3xl font-medium">
					{t('pages.invite.acceptInvite.messages.WORKSPACE_NOT_EXIST.TITLE')}
				</h2>
				<p className="text-lg text-gray-400">
					{t('pages.invite.acceptInvite.messages.WORKSPACE_NOT_EXIST.DESCRIPTION')}
				</p>
			</div>

			<div className="flex flex-col gap-8 justify-center items-center w-full md:flex-row">
				<Button variant="outline">
					<Link href={'/'}>{t('pages.invite.acceptInvite.buttons.RETURN_TO_DASHBOARD')}</Link>
				</Button>
				<Button>
					<Link href={'/auth/signup'}>{t('pages.invite.acceptInvite.buttons.CREATE_NEW_WORKSPACE')}</Link>
				</Button>
			</div>
		</div>
	);
}
