'use client';

import { Lock } from '@/core/components/icons';
import { Button } from '@/core/components/common/button';
import { Text } from '@/core/components/common/typography';
import { ToastOrb } from '@/core/components/common/toast-orb';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { DEFAULT_APP_PATH } from '@/core/constants/config/constants';
import { SystemPageFrame, SYSTEM_PAGE_TEXT_CLASS, SYSTEM_PAGE_TITLE_CLASS } from '../error/system-page-frame';

function UnauthorizedPage() {
	const t = useTranslations();

	return (
		<SystemPageFrame>
			<ToastOrb tone="neutral" glyph={<Lock aria-hidden="true" />} className="mb-2" />
			<Text className={SYSTEM_PAGE_TITLE_CLASS}>{t('pages.systemPages.UNAUTHORIZED_TITLE')}</Text>
			<Text className={SYSTEM_PAGE_TEXT_CLASS}>{t('pages.systemPages.UNAUTHORIZED_TEXT')}</Text>
			<Button asChild className="mt-3">
				<Link href={DEFAULT_APP_PATH}>{t('pages.systemPages.SIGN_IN')}</Link>
			</Button>
		</SystemPageFrame>
	);
}

export default UnauthorizedPage;
