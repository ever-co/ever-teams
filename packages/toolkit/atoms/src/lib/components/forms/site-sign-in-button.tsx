'use client';

import { useAtomValue } from 'jotai';
import { useTranslation } from 'react-i18next';
import { cn, ThemedButton } from '@ever-teams/toolkit-ui';
import { KIT_NOTICE_SURFACE, kitNoticeTone } from '@components/teams-ui-components/notice-surface';
import { hostSessionAtom } from '@lib/session/host-session';
import { useSiteSignIn } from '@lib/session/site-sign-in-context';

/**
 * "Sign in with Ever Teams", for a signed-out person on a site that signs people in with Ever Teams (config.signIn
 * 'ever-teams'): it opens the web app in a popup, where the person allows the site. Nothing while the kit renews a
 * saved sign-in at start, or outside that mode.
 */
export function SiteSignInButton({ className }: Readonly<{ className?: string }>) {
	const { t } = useTranslation();
	const controls = useSiteSignIn();
	const { status } = useAtomValue(hostSessionAtom);
	if (!controls || status !== 'signed-out') {
		return null;
	}
	const isWaiting = controls.status === 'waiting';
	const isBlocked = controls.status === 'blocked';
	return (
		<div className={cn('flex max-w-xs flex-col items-start gap-2', className)}>
			<ThemedButton type="button" className="min-w-28" aria-busy={isWaiting} onClick={controls.signIn}>
				{t('AUTH.sign_in_with_ever_teams')}
			</ThemedButton>
			{isWaiting && (
				<p role="status" className={cn(KIT_NOTICE_SURFACE, kitNoticeTone('neutral'))}>
					{t('AUTH.site_sign_in_waiting')}
				</p>
			)}
			{isBlocked && (
				<p role="alert" className={cn(KIT_NOTICE_SURFACE, kitNoticeTone('error'))}>
					{t('AUTH.site_sign_in_blocked')}
				</p>
			)}
		</div>
	);
}
