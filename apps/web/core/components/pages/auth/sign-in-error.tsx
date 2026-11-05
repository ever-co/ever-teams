'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Alert } from '@/core/components/icons';
import { Button } from '@/core/components/common/button';
import { ToastOrb } from '@/core/components/common/toast-orb';
import { DEFAULT_APP_PATH } from '@/core/constants/config/constants';
import {
	SystemPageFrame,
	SYSTEM_PAGE_TEXT_CLASS,
	SYSTEM_PAGE_TITLE_CLASS
} from '@/core/components/pages/error/system-page-frame';

export function SignInError({ code }: Readonly<{ code?: string | null }>) {
	const t = useTranslations();
	const hasCode = Boolean(code);

	return (
		<SystemPageFrame>
			<ToastOrb tone="error" glyph={<Alert aria-hidden="true" />} className="mb-2" />
			<h1 className={SYSTEM_PAGE_TITLE_CLASS}>{t('auth.error.TITLE')}</h1>
			<p className={SYSTEM_PAGE_TEXT_CLASS}>{t('auth.error.TEXT')}</p>
			<Button asChild className="mt-3 min-w-36">
				<Link href={DEFAULT_APP_PATH}>{t('auth.error.RETRY')}</Link>
			</Button>
			{hasCode && (
				<p className="mt-1 text-xs text-muted-foreground tabular-nums">
					{t('auth.error.CODE', { code: code ?? '' })}
				</p>
			)}
		</SystemPageFrame>
	);
}
