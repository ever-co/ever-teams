'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button, Text } from '@/core/components';
import { ToastOrb } from '@/core/components/common/toast-orb';
import { Mail } from '@/core/components/icons';
import {
	SystemPageFrame,
	SYSTEM_PAGE_TEXT_CLASS,
	SYSTEM_PAGE_TITLE_CLASS
} from '@/core/components/pages/error/system-page-frame';
import { useEmailVerifyToken } from '@/core/hooks';

/** The page an email verification link opens: the check in progress, then its failure (a success leaves the page). */
export function VerifyEmailPage() {
	const { loading, failed } = useEmailVerifyToken();
	const t = useTranslations();

	if (failed) {
		return (
			<SystemPageFrame>
				<ToastOrb tone="error" glyph={<Mail aria-hidden="true" />} className="mb-2" />
				<h1 className={SYSTEM_PAGE_TITLE_CLASS}>{t('pages.authTeam.VERIFY_EMAIL_FAILED_TITLE')}</h1>
				<Text className={SYSTEM_PAGE_TEXT_CLASS}>{t('pages.authTeam.VERIFY_EMAIL_FAILED_MESSAGE')}</Text>
				<Button variant="outline" asChild className="mt-3">
					<Link href="/">{t('pages.profile.GO_TO_HOME')}</Link>
				</Button>
			</SystemPageFrame>
		);
	}

	return (
		<SystemPageFrame>
			<div role="status" aria-live="polite" aria-busy={loading} className="flex flex-col items-center gap-3">
				<ToastOrb tone="loading" className="mb-2" />
				<Text className={SYSTEM_PAGE_TITLE_CLASS}>{t('pages.authTeam.VERIFY_EMAIL_LOADING_TEXT')}</Text>
			</div>
		</SystemPageFrame>
	);
}
