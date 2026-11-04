import SadCry from '@/core/components/svgs/sad-cry';
import { Text } from '@/core/components/common/typography';
import { Button } from '@/core/components/common/button';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { DEFAULT_APP_PATH } from '@/core/constants/config/constants';
import {
	SystemPageFrame,
	SYSTEM_PAGE_EYEBROW_CLASS,
	SYSTEM_PAGE_TEXT_CLASS,
	SYSTEM_PAGE_TITLE_CLASS
} from './system-page-frame';

export default function ErrorPageComponent() {
	const t = useTranslations();
	return (
		<SystemPageFrame>
			<div className="flex flex-col items-center gap-3 text-muted-foreground">
				<SadCry width={48} height={48} fill="currentColor" />
				<Text className={SYSTEM_PAGE_EYEBROW_CLASS}>{t('pages.error.TITLE')}</Text>
			</div>

			<Text className={SYSTEM_PAGE_TITLE_CLASS}>{t('pages.error.HEADING_TITLE')}</Text>
			<Text className={SYSTEM_PAGE_TEXT_CLASS}>{t('pages.error.HEADING_DESCRIPTION')}</Text>

			<Button asChild className="mt-2">
				<Link href={DEFAULT_APP_PATH}>{t('pages.unauthorized.TRY_AGAIN')}</Link>
			</Button>
			<Link
				href={DEFAULT_APP_PATH}
				className="rounded-sm text-sm text-muted-foreground underline-offset-4 outline-none transition-colors hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
			>
				{t('pages.authLogin.ERROR_SIGNIN')}
			</Link>
		</SystemPageFrame>
	);
}
