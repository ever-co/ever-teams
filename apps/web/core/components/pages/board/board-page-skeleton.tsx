'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/core/lib/helpers';

const ISLAND = 'absolute animate-pulse rounded-lg bg-foreground/[0.05]';

/** No `PageSkeletonFrame`: the board has no page chrome, Excalidraw's islands sit on a full-height surface. */
export function BoardPageSkeleton() {
	const t = useTranslations();
	return (
		<div role="status" aria-live="polite" aria-busy="true" className="relative h-screen w-full">
			<span className="sr-only">{t('common.LOADING')}</span>
			<span aria-hidden="true" className={cn(ISLAND, 'top-4 left-4 size-9')} />
			<span
				aria-hidden="true"
				className={cn(ISLAND, 'top-4 left-1/2 h-11 w-[34rem] -translate-x-1/2 max-md:hidden')}
			/>
			<span aria-hidden="true" className={cn(ISLAND, 'top-4 right-4 h-9 w-21')} />
			<span aria-hidden="true" className={cn(ISLAND, 'bottom-4 left-4 h-9 w-33')} />
			<span aria-hidden="true" className={cn(ISLAND, 'bottom-4 left-39 h-9 w-18')} />
		</div>
	);
}
