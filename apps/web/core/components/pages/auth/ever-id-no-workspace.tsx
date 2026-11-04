'use client';

import { Info } from '@/core/components/icons';
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
	const offersSignup = offerSignup && !blocked;
	let title = t('pages.auth.everId.NO_WORKSPACE_TITLE');
	let body = t('pages.auth.everId.NO_WORKSPACE_BODY');
	if (blocked) {
		title = t('pages.auth.everId.WORKSPACE_BLOCKED_TITLE');
		body = t('pages.auth.everId.WORKSPACE_BLOCKED_BODY');
	}

	return (
		<SystemPageFrame>
			<div className={SYSTEM_PAGE_ICON_TILE_CLASS}>
				<Info className="size-5" aria-hidden="true" />
			</div>
			<Text className={SYSTEM_PAGE_TITLE_CLASS}>{title}</Text>
			<Text className={SYSTEM_PAGE_TEXT_CLASS}>{body}</Text>
			{offersSignup && (
				<Text className="text-sm text-balance text-muted-foreground">
					{t('pages.auth.everId.NO_WORKSPACE_SIGNUP_BODY')}
				</Text>
			)}
			<div className="mt-2 flex flex-wrap justify-center gap-2">
				<Button asChild>
					<Link href={DEFAULT_APP_PATH}>{t('pages.auth.everId.SIGN_IN_ANOTHER_WAY')}</Link>
				</Button>
				{offersSignup && (
					<Button asChild variant="outline">
						<Link href="/auth/signup">{t('pages.auth.everId.CREATE_WORKSPACE')}</Link>
					</Button>
				)}
			</div>
		</SystemPageFrame>
	);
}
