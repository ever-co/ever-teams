'use client';

import { Mail } from '@/core/components/icons';
import { Button } from '@/core/components/common/button';
import { Text } from '@/core/components/common/typography';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { DEFAULT_APP_PATH } from '@/core/constants/config/constants';
import {
	SystemPageFrame,
	SYSTEM_PAGE_ICON_TILE_CLASS,
	SYSTEM_PAGE_TEXT_CLASS,
	SYSTEM_PAGE_TITLE_CLASS
} from '@/core/components/pages/error/system-page-frame';

/**
 * Where a provider sign-in (Google, GitHub...) ends when the address belongs to an account that has not confirmed
 * it yet, often one an admin created. Gauzy matches confirmed accounts only, and the code sign-in does not confirm
 * the address: the home page notice does, after which the provider signs the person in.
 */
export default function ProviderAccountUnconfirmed() {
	const t = useTranslations();

	return (
		<SystemPageFrame>
			<div className={SYSTEM_PAGE_ICON_TILE_CLASS}>
				<Mail className="size-5" aria-hidden="true" />
			</div>
			<Text className={SYSTEM_PAGE_TITLE_CLASS}>{t('pages.auth.provider.ACCOUNT_UNCONFIRMED_TITLE')}</Text>
			<Text className={SYSTEM_PAGE_TEXT_CLASS}>{t('pages.auth.provider.ACCOUNT_UNCONFIRMED_BODY')}</Text>
			<div className="mt-2 flex flex-wrap justify-center gap-2">
				<Button asChild>
					<Link href={DEFAULT_APP_PATH}>{t('pages.auth.provider.SIGN_IN_WITH_EMAIL')}</Link>
				</Button>
			</div>
		</SystemPageFrame>
	);
}
