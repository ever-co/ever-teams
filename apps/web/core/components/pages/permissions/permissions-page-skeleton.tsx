'use client';

import { useTranslations } from 'next-intl';
import { Text } from '@/core/components/common/typography';
import { PageSkeletonFrame, PageUpdatingBar } from '@/core/components/layouts/page-skeleton';
import { cn } from '@/core/lib/helpers';

const ROLE_ROW_WIDTHS = ['w-24', 'w-32', 'w-20', 'w-28'];

export const PERMISSIONS_GRID = 'grid w-full grid-cols-1 items-start gap-6 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-8';

export const ROLE_LIST = 'flex w-full flex-col gap-0.5 md:sticky md:top-4';

export function PermissionsToolbar({ isUpdating = false }: Readonly<{ isUpdating?: boolean }>) {
	const t = useTranslations();
	return (
		<div className="relative px-4">
			<div className="flex flex-wrap items-center justify-between gap-3 py-3">
				<h1 className="truncate text-lg font-semibold">{t('pages.permissions.TITLE')}</h1>
			</div>
			<PageUpdatingBar isUpdating={isUpdating} label={t('pages.permissions.LOADING_PERMISSIONS')} />
		</div>
	);
}

export function RoleListSkeleton() {
	return (
		<>
			{ROLE_ROW_WIDTHS.map((width) => (
				<span key={width} aria-hidden="true" className="flex h-8 w-full shrink-0 items-center px-3">
					<span className={cn('h-3 animate-pulse rounded-full bg-foreground/[0.06]', width)} />
				</span>
			))}
		</>
	);
}

export function SelectRolePrompt() {
	const t = useTranslations();

	return (
		<div className="flex flex-col items-center py-16 text-center">
			<div className="flex size-10 items-center justify-center rounded-lg bg-foreground/5">
				<Text className="text-base font-semibold text-muted-foreground">!</Text>
			</div>

			<Text className="mt-3 text-sm font-semibold text-foreground">{t('common.SELECT_ROLE')}</Text>
		</div>
	);
}

export function PermissionsPageSkeleton() {
	return (
		<PageSkeletonFrame className="items-start" toolbar={<PermissionsToolbar />}>
			<div className={PERMISSIONS_GRID}>
				<div className={ROLE_LIST}>
					<RoleListSkeleton />
				</div>
				<div className="flex w-full min-w-0 flex-col">
					<SelectRolePrompt />
				</div>
			</div>
		</PageSkeletonFrame>
	);
}
