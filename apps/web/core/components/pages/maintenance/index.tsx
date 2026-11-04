'use client';
import { Wrench } from '@/core/components/icons';
import { Button, Text } from '@/core/components';
import { ToastOrb } from '@/core/components/common/toast-orb';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { APP_NAME } from '@/core/constants/config/constants';
import { SystemPageFrame, SYSTEM_PAGE_TEXT_CLASS, SYSTEM_PAGE_TITLE_CLASS } from '../error/system-page-frame';

function Maintenance() {
	const t = useTranslations();
	return (
		<SystemPageFrame>
			<ToastOrb tone="warning" glyph={<Wrench aria-hidden="true" />} className="mb-2" />
			<Text className={SYSTEM_PAGE_TITLE_CLASS}>
				{t('pages.systemPages.MAINTENANCE_TITLE', { appName: APP_NAME })}
			</Text>
			<Text className={SYSTEM_PAGE_TEXT_CLASS}>{t('pages.systemPages.MAINTENANCE_TEXT')}</Text>
			<Button asChild variant="outline" className="mt-3">
				<Link href={'/'}>{t('pages.unauthorized.TRY_AGAIN')}</Link>
			</Button>
		</SystemPageFrame>
	);
}

export default Maintenance;
