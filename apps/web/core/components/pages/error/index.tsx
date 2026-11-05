'use client';

import SadCry from '@/core/components/svgs/sad-cry';
import { Text } from '@/core/components/common/typography';
import { Button } from '@/core/components/common/button';
import { useTranslations } from 'next-intl';
import React from 'react';
import { cn } from '@/core/lib/helpers';
import {
	SystemPageFrame,
	SYSTEM_PAGE_EYEBROW_CLASS,
	SYSTEM_PAGE_TEXT_CLASS,
	SYSTEM_PAGE_TITLE_CLASS
} from './system-page-frame';

// The raw cause, message and stack help a developer; members only need the heading and the retry action.
const showsErrorDetails = process.env.NODE_ENV === 'development';

function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
	const t = useTranslations();

	React.useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<SystemPageFrame className={cn(showsErrorDetails && 'max-w-3xl')}>
			<div className="flex flex-col items-center gap-3 text-muted-foreground">
				<SadCry width={48} height={48} fill="currentColor" />
				<Text className={SYSTEM_PAGE_EYEBROW_CLASS}>{t('pages.error.TITLE')}</Text>
			</div>

			<Text className={SYSTEM_PAGE_TITLE_CLASS}>{t('pages.error.HEADING_TITLE')}</Text>
			<Text className={cn(SYSTEM_PAGE_TEXT_CLASS, 'max-w-xl')}>{t('pages.error.HEADING_DESCRIPTION')}</Text>
			<Button onClick={() => reset()}>{t('pages.unauthorized.TRY_AGAIN')}</Button>

			{showsErrorDetails && (
				<div className="mt-4 flex w-full flex-col gap-2 rounded-lg bg-destructive/5 p-4 text-left hairline-ring ring-destructive/20">
					<h4 className="text-sm font-medium text-destructive-ink">{JSON.stringify(error.cause)}</h4>
					<p className="text-sm font-medium text-destructive-ink">{error.message}</p>
					<p className="whitespace-pre-wrap break-words font-mono text-xs text-muted-foreground">
						{error.stack}
					</p>
				</div>
			)}
		</SystemPageFrame>
	);
}

export default ErrorPage;
