'use client';
import { cn } from '@/core/lib/helpers';
import { useTranslations } from 'next-intl';
import { PageLayout } from '../layouts/default-layout';
import { fullWidthState } from '@/core/stores/common/full-width';
import { useAtomValue } from 'jotai';
import { FC } from 'react';
import { Container } from './container';

/**
 * GlobalSkeleton — Minimal loading skeleton shown by `(main)/loading.tsx`
 * while the actual page component loads.
 *
 * Intentionally minimal: each page has its own dedicated skeleton
 * (e.g. TeamTasksPageSkeleton, KanbanPageSkeleton) that renders
 * the correct structure once the page component mounts.
 */
const GlobalSkeleton: FC<{ className?: string }> = ({ className }) => {
	const t = useTranslations();
	const fullWidth = useAtomValue(fullWidthState);
	return (
		<PageLayout title={t('common.LOADING')} className={className}>
			<Container fullWidth={fullWidth} className={cn('flex flex-col items-stretch gap-4 pt-6', className)}>
				<div className="w-full bg-[#F0F0F0] dark:bg-[#353741] h-10 rounded-lg animate-pulse" />
				<div className="w-full bg-[#F0F0F0] dark:bg-[#353741] h-48 rounded-xl animate-pulse" />
				<div className="w-2/3 bg-[#F0F0F0] dark:bg-[#353741] h-10 rounded-lg animate-pulse" />
			</Container>
		</PageLayout>
	);
};
export default GlobalSkeleton;
