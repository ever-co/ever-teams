'use client';

import { useTranslations } from 'next-intl';
import { PageSkeletonFrame, ToolbarPills } from '@/core/components/layouts/page-skeleton';
import { SegmentedControlSkeleton } from '@/core/components/common/skeleton/segmented-control-skeleton';
import { ClientsCountSkeleton, ClientsListSkeleton } from './clients-list-states';

const VIEW_SEGMENTS = [{}, {}];

const SCOPE_SEGMENTS = [
	{ labelWidth: 'w-10', hasCount: true },
	{ labelWidth: 'w-14', hasCount: true }
];

const CREATE_WIDTHS = ['w-28'];

const SEARCH_WIDTHS = ['w-full sm:w-60'];

const SORT_WIDTHS = ['w-20'];

function ClientsToolbarSkeleton() {
	const t = useTranslations();
	return (
		<div className="px-4" aria-hidden="true">
			<div className="flex min-h-14 flex-wrap items-center justify-between gap-3 py-2.5">
				<div className="flex min-w-0 items-baseline gap-2">
					<h1 className="truncate text-lg font-semibold text-foreground">{t('clients.TITLE')}</h1>
					<ClientsCountSkeleton />
				</div>
				<div className="flex items-center gap-2">
					<SegmentedControlSkeleton segments={VIEW_SEGMENTS} />
					<ToolbarPills widths={CREATE_WIDTHS} />
				</div>
			</div>
			<div className="flex flex-wrap items-center gap-2 pb-3">
				<SegmentedControlSkeleton segments={SCOPE_SEGMENTS} />
				<div className="flex max-sm:order-last max-sm:basis-full">
					<ToolbarPills widths={SEARCH_WIDTHS} />
				</div>
				<div className="ml-auto flex">
					<ToolbarPills widths={SORT_WIDTHS} />
				</div>
			</div>
		</div>
	);
}

export function ClientsPageSkeleton() {
	return (
		<PageSkeletonFrame toolbar={<ClientsToolbarSkeleton />}>
			<ClientsListSkeleton />
		</PageSkeletonFrame>
	);
}
