'use client';

import { useTranslations } from 'next-intl';
import { readRuntimeEnv } from '@/env-config';
import { APP_LINK, IS_DEMO_MODE } from '@/core/constants/config/constants';

/**
 * Where the banner sends a visitor of the demo: the page where they open a real account, not the demo's own sign-up.
 * `NEXT_PUBLIC_DEMO_SIGN_UP_URL` (read at runtime) names it; unset, it is the sign-up page of `APP_LINK`, the hosted
 * app (its built-in default unless the deployment names another). There is no built-in URL of its own: the egress
 * audit's static scan allows an Ever host in the client bundle only as the existing APP_LINK default
 * (tools/egress-audit/ui-baseline.json), and app code names Ever hosts only in core/constants/config/constants.tsx.
 */
let warnedInvalidSignUpUrl = false;

export function demoSignUpUrl(): string {
	const configured = (
		readRuntimeEnv('NEXT_PUBLIC_DEMO_SIGN_UP_URL') || process.env.NEXT_PUBLIC_DEMO_SIGN_UP_URL
	)?.trim();
	if (configured) {
		if (isAbsoluteHttpUrl(configured)) {
			return configured;
		}
		// A scheme-less value would resolve against the demo's own origin, not the real sign-up page
		if (!warnedInvalidSignUpUrl) {
			warnedInvalidSignUpUrl = true;
			console.warn(
				'NEXT_PUBLIC_DEMO_SIGN_UP_URL is not an absolute http(s) URL; the demo banner links to APP_LINK'
			);
		}
	}
	return `${APP_LINK.replace(/\/+$/, '')}/auth/signup`;
}

function isAbsoluteHttpUrl(value: string): boolean {
	try {
		const { protocol } = new URL(value);
		return protocol === 'https:' || protocol === 'http:';
	} catch {
		return false;
	}
}

/**
 * The strip above every app page of a demo deployment (`NEXT_PUBLIC_DEMO=true`, as the hosted demo), the same notice
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
				href={demoSignUpUrl()}
				className="rounded-sm font-semibold text-primary-ink underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/25"
			>
				{t('common.DEMO_BANNER_SIGN_UP')}
			</a>
		</div>
	);
}
