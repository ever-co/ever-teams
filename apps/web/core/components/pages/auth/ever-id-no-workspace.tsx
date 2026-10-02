'use client';

import { InfoCircledIcon } from '@radix-ui/react-icons';
import { Button, Text } from '@/core/components';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { DEFAULT_APP_PATH } from '@/core/constants/config/constants';

/**
 * Where an Ever ID sign-in ends when it cannot enter any workspace: no workspace is linked to that Ever ID
 * (nothing was created), or every linked workspace asks for its company sign-in instead. A deployment that opted
 * in (EVER_ID_TEAMS_AUTO_PROVISION) also offers its usual sign-up here; nothing is created until the person
 * completes it.
 */
export default function EverIdNoWorkspace({
	reason = 'no_workspace',
	offerSignup = false
}: Readonly<{
	reason?: 'no_workspace' | 'blocked';
	offerSignup?: boolean;
}>) {
	const t = useTranslations();
	const blocked = reason === 'blocked';

	return (
		<div className="flex flex-col gap-6 items-center px-4 mx-auto mt-28 max-w-2xl text-center">
			<InfoCircledIcon width={64} height={64} className="text-[#8C7AE4]" aria-hidden="true" />
			<Text className="text-3xl font-bold text-[#282048] dark:text-light--theme">
				{blocked ? t('pages.auth.everId.WORKSPACE_BLOCKED_TITLE') : t('pages.auth.everId.NO_WORKSPACE_TITLE')}
			</Text>
			<Text className="text-lg leading-7 text-gray-400">
				{blocked ? t('pages.auth.everId.WORKSPACE_BLOCKED_BODY') : t('pages.auth.everId.NO_WORKSPACE_BODY')}
			</Text>
			{offerSignup && !blocked && (
				<Text className="text-base leading-6 text-gray-400">
					{t('pages.auth.everId.NO_WORKSPACE_SIGNUP_BODY')}
				</Text>
			)}
			<div className="flex flex-wrap gap-3 justify-center">
				<Button asChild className="px-7 font-normal rounded-lg">
					<Link href={DEFAULT_APP_PATH}>{t('pages.auth.everId.SIGN_IN_ANOTHER_WAY')}</Link>
				</Button>
				{offerSignup && !blocked && (
					<Button asChild variant="outline" className="px-7 font-normal rounded-lg">
						<Link href="/auth/signup">{t('pages.auth.everId.CREATE_WORKSPACE')}</Link>
					</Button>
				)}
			</div>
		</div>
	);
}
