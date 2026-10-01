'use client';

import { InfoCircledIcon } from '@radix-ui/react-icons';
import { Button, Text } from '@/core/components';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { DEFAULT_APP_PATH } from '@/core/constants/config/constants';

/**
 * Where an Ever ID sign-in ends when it cannot enter any workspace: no workspace is linked to that Ever ID
 * (nothing was created), or every linked workspace asks for its company sign-in instead.
 */
export default function EverIdNoWorkspace({ reason = 'no_workspace' }: { reason?: 'no_workspace' | 'blocked' }) {
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
			<Link href={DEFAULT_APP_PATH}>
				<Button className="px-7 font-normal rounded-lg">{t('pages.auth.everId.SIGN_IN_ANOTHER_WAY')}</Button>
			</Link>
		</div>
	);
}
