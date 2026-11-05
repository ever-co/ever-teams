'use client';
// By path, never through the '@/core/components' barrel: Next loads the root not-found boundary
// (app/not-found.tsx) on every page, in chunks of its own, so the barrel would ship the whole
// component and hook graph a second time.
import { Button } from '@/core/components/common/button';
import { Text } from '@/core/components/common/typography';
import {
	SystemPageFrame,
	SYSTEM_PAGE_EYEBROW_CLASS,
	SYSTEM_PAGE_TEXT_CLASS,
	SYSTEM_PAGE_TITLE_CLASS
} from '@/core/components/pages/error/system-page-frame';
import { cn } from '@/core/lib/helpers';
import Link from 'next/link';
import { moduleConstantsSawRuntimeEnv } from '@/env-config';

export interface NotFoundLabels {
	title: string;
	description: string;
	action: string;
}

/**
 * The root boundary (app/not-found.tsx) renders outside the locale layout, so it has no intl provider:
 * these English defaults serve it, and app/[locale]/not-found.tsx passes the translated labels.
 */
const DEFAULT_LABELS: NotFoundLabels = {
	title: 'Page not found',
	description: 'This page does not exist or has moved.',
	action: 'Go back to home'
};

function NotFound({ labels = DEFAULT_LABELS }: Readonly<{ labels?: NotFoundLabels }>) {
	const canSoftNavigate = moduleConstantsSawRuntimeEnv();
	return (
		<SystemPageFrame className="min-h-[60dvh] justify-center">
			<Text className={cn(SYSTEM_PAGE_EYEBROW_CLASS, 'tabular-nums')}>404</Text>

			<Text className={SYSTEM_PAGE_TITLE_CLASS}>{labels.title}</Text>

			<Text className={SYSTEM_PAGE_TEXT_CLASS}>{labels.description}</Text>

			{/*
			 * Next renders some documents without app/layout.tsx — its own `<html id="__next_error__">`
			 * shell, client-rendered after an SSR error or a notFound() raised during SSR (/foo.bar,
			 * whose dotted first segment proxy.ts's matcher skips). They carry no runtime env, so this
			 * bundle's module-level constants are frozen at the build-time defaults. Leave such a
			 * document with a full page load: a soft navigation would carry Ever's branding, captcha
			 * type and demo flags into a self-hosted app until the next reload.
			 */}
			{canSoftNavigate && (
				<Button asChild className="mt-2">
					<Link href="/">{labels.action}</Link>
				</Button>
			)}
			{!canSoftNavigate && (
				<Button asChild className="mt-2">
					<a href="/">{labels.action}</a>
				</Button>
			)}
		</SystemPageFrame>
	);
}

export default NotFound;
