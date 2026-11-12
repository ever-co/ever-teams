'use client';

import { useTranslations } from 'next-intl';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { cn } from '@/core/lib/helpers';
import { SavedViewsSkeleton } from './views-index-parts';
import { ViewsBreadcrumb } from './views-breadcrumb';

/** The views index while it loads: the four built-in cards, then the saved views' rows, in their own places. */
export function ViewsPageSkeleton() {
	const t = useTranslations();
	return (
		<PageLayout title={t('taskViews.TITLE')} breadcrumb={<ViewsBreadcrumb />} className="min-h-0 flex-1">
			<div className="mx-auto flex w-full max-w-5xl flex-col gap-8 pb-8" aria-busy="true">
				<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					{[0, 1, 2, 3].map((card) => (
						<div
							key={card}
							className="flex items-start gap-3 rounded-xl bg-card p-3.5 hairline-ring ring-border"
						>
							<span className="size-9 shrink-0 animate-pulse rounded-lg bg-foreground/[0.06]" />
							<span className="flex flex-1 flex-col gap-2 pt-1">
								<span className={cn(SKELETON_BAR, 'h-3 w-24')} />
								<span className={cn(SKELETON_BAR, 'h-2.5 w-36')} />
							</span>
						</div>
					))}
				</div>
				<div className="overflow-hidden rounded-xl bg-card hairline-ring ring-border">
					<SavedViewsSkeleton />
				</div>
			</div>
		</PageLayout>
	);
}
