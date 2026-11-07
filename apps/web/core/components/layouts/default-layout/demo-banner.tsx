'use client';

import { useTranslations } from 'next-intl';
import { APP_LINK, IS_DEMO_MODE } from '@/core/constants/config/constants';

/**
 * Where the banner sends a visitor of the demo: the hosted app's sign-up page, so a person trying the demo can
 * open a real account. `APP_LINK` is the hosted app (https://app.ever.team unless the deployment names another).
 */
export const DEMO_SIGN_UP_URL = `${APP_LINK.replace(/\/+$/, '')}/auth/signup`;

/**
 * The strip above every app page of a demo deployment (`NEXT_PUBLIC_DEMO=true`, as demo.ever.team), the same notice
 * demo.gauzy.co shows: this is a demo account, and a link to sign up for a real one. Renders nothing anywhere else,
 * so stage, production and self-hosted deployments never show it.
 */
export function DemoBanner() {
	const t = useTranslations();

	if (!IS_DEMO_MODE) {
		return null;
	}

	return (
		<div
			role="note"
			data-testid="demo-banner"
			className="flex w-full shrink-0 flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 hairline-b border-border bg-primary/10 px-4 py-1.5 text-center text-xs leading-snug text-muted-foreground"
		>
			<span>{t('common.DEMO_BANNER_TEXT')}</span>
			<a
				href={DEMO_SIGN_UP_URL}
				className="rounded-sm font-semibold text-primary-ink underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/25"
			>
				{t('common.DEMO_BANNER_SIGN_UP')}
			</a>
		</div>
	);
}
