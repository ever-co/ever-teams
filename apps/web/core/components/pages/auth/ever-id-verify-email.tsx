'use client';

import { Mail } from '@/core/components/icons';
import { Button } from '@/core/components/common/button';
import { Text } from '@/core/components/common/typography';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { DEFAULT_APP_PATH } from '@/core/constants/config/constants';
import { restartEverIdSignIn } from '@/core/lib/auth/ever-id/restart';
import {
	SystemPageFrame,
	SYSTEM_PAGE_ICON_TILE_CLASS,
	SYSTEM_PAGE_TEXT_CLASS,
	SYSTEM_PAGE_TITLE_CLASS
} from '@/core/components/pages/error/system-page-frame';

/** The route that opens Ever ID's verification form for the person the refused sign-in was for. */
const VERIFY_EMAIL_ROUTE = '/api/auth/ever-id/verify-email';

/**
 * Where an Ever ID sign-in ends when Ever ID has not verified the person's e-mail address yet: the API signs in
 * verified addresses only. Instead of "access denied", the person verifies the address on Ever ID (the route reads who
 * they are from the sealed cookie the sign-in set) and signs in with Ever ID again.
 */
export default function EverIdVerifyEmail() {
	const t = useTranslations();

	return (
		<SystemPageFrame>
			<div className={SYSTEM_PAGE_ICON_TILE_CLASS}>
				<Mail className="size-5" aria-hidden="true" />
			</div>
			<Text className={SYSTEM_PAGE_TITLE_CLASS}>{t('pages.auth.everId.EMAIL_UNVERIFIED_TITLE')}</Text>
			<Text className={SYSTEM_PAGE_TEXT_CLASS}>{t('pages.auth.everId.EMAIL_UNVERIFIED_BODY')}</Text>
			<div className="mt-2 flex flex-wrap justify-center gap-2">
				{/* A full page load: the route answers with a redirect to Ever ID. */}
				<Button asChild>
					<a href={VERIFY_EMAIL_ROUTE}>{t('pages.auth.everId.VERIFY_EMAIL')}</a>
				</Button>
				<Button type="button" variant="outline" onClick={restartEverIdSignIn}>
					{t('pages.auth.everId.SIGN_IN_AGAIN')}
				</Button>
			</div>
			<Link
				href={DEFAULT_APP_PATH}
				className="rounded-sm text-sm text-muted-foreground underline underline-offset-4 outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
			>
				{t('pages.auth.everId.SIGN_IN_ANOTHER_WAY')}
			</Link>
		</SystemPageFrame>
	);
}
