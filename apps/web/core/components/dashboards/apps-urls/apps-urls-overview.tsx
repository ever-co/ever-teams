'use client';

import { memo, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ShareBar, shareToneOf } from '@/core/components/dashboards/kit/share-rows';
import { DASHBOARD_SURFACE, SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { InformationCircle } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort, formatPercent, type ShareRow } from '@/core/lib/utils/dashboard-figures';
import {
	ACTIVITY_REPORT_ROW_CAP,
	type MosaicItem,
	type TitleTotal,
	type UsageFigures
} from '@/core/lib/utils/dashboards/apps-urls';
import { AppsUrlsMosaic, AppsUrlsMosaicMessage, AppsUrlsMosaicSkeleton } from './apps-urls-mosaic';

const MISSING_VALUE = '–';

const LEGEND_GRID = 'grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-4';

const NOTE_LINE = 'flex items-start gap-2 text-xs text-muted-foreground';

function SplitLegendName({ row }: Readonly<{ row: ShareRow<TitleTotal> }>) {
	const t = useTranslations();
	if (row.isOther) {
		return <span className="truncate text-muted-foreground">{t('dashboard.appsUrls.SPLIT_REST')}</span>;
	}
	const title = row.item?.title ?? '';
	if (!title) {
		return <span className="truncate text-muted-foreground">{t('dashboard.appsUrls.UNTITLED')}</span>;
	}
	return (
		<span className="truncate text-foreground" title={title}>
			{title}
		</span>
	);
}

function SplitLegend({ rows }: Readonly<{ rows: ReadonlyArray<ShareRow<TitleTotal>> }>) {
	const locale = useLocale();
	return (
		<ul className={LEGEND_GRID}>
			{rows.map((row, index) => (
				<li key={row.key} className="flex min-h-8 min-w-0 items-center gap-2 text-[13px]">
					<span
						aria-hidden="true"
						className={cn('size-2 shrink-0 rounded-full', shareToneOf(index, row.isOther))}
					/>
					<span className="flex min-w-0 flex-1">
						<SplitLegendName row={row} />
					</span>
					<span className="shrink-0 font-medium tabular-nums text-foreground">
						{formatDurationShort(row.value)}
					</span>
					<span className="w-9 shrink-0 text-right tabular-nums text-muted-foreground">
						{formatPercent(row.share, locale)}
					</span>
				</li>
			))}
		</ul>
	);
}

function averageSecondsOf(figures: UsageFigures) {
	if (!figures.memberCount) {
		return 0;
	}
	return figures.totalSeconds / figures.memberCount;
}

function totalMetaOf(figures: UsageFigures, t: ReturnType<typeof useTranslations>) {
	const parts = {
		titles: t('dashboard.appsUrls.TITLE_COUNT', { count: figures.titleCount }),
		members: t('dashboard.appsUrls.MEMBER_COUNT', { count: figures.memberCount }),
		days: t('dashboard.appsUrls.DAY_COUNT', { count: figures.dayCount })
	};
	const hasSeveralMembers = figures.memberCount > 1;
	if (!hasSeveralMembers) {
		return t('dashboard.appsUrls.TOTAL_META', parts);
	}
	const averageDuration = formatDurationShort(averageSecondsOf(figures));
	const average = t('dashboard.appsUrls.MEMBERS_HINT', { duration: averageDuration });
	return t('dashboard.appsUrls.TOTAL_META_WITH_AVERAGE', { ...parts, average });
}

function SplitBand({
	figures,
	splitRows,
	isUnavailable
}: Readonly<{
	figures: UsageFigures;
	splitRows: ReadonlyArray<ShareRow<TitleTotal>>;
	isUnavailable: boolean;
}>) {
	const t = useTranslations();
	const hasSplit = splitRows.length > 0;
	const isAvailable = !isUnavailable;
	const showsSplit = hasSplit && isAvailable;
	let total = MISSING_VALUE;
	if (isAvailable) {
		total = formatDurationShort(figures.totalSeconds);
	}

	return (
		<div className="flex flex-col gap-3 px-4 pt-3 pb-2">
			<div className="flex min-w-0 flex-col gap-0.5">
				<h2 className="text-xs text-muted-foreground">{t('dashboard.appsUrls.TIME_LABEL')}</h2>
				<p className="flex min-w-0 flex-wrap items-baseline gap-x-2">
					<span className="text-lg font-semibold tabular-nums text-foreground">{total}</span>
					{showsSplit && (
						<span className="text-xs tabular-nums text-muted-foreground">{totalMetaOf(figures, t)}</span>
					)}
				</p>
			</div>
			{showsSplit && <ShareBar rows={splitRows} className="h-2" />}
			{!showsSplit && <span aria-hidden="true" className="block h-2 w-full rounded-full bg-foreground/[0.06]" />}
			{showsSplit && <SplitLegend rows={splitRows} />}
		</div>
	);
}

function OverviewNotes({ isCapped }: Readonly<{ isCapped: boolean }>) {
	const t = useTranslations();
	return (
		<div className="flex flex-col gap-1.5 px-4 py-2.5">
			<div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1.5">
				<p className={cn(NOTE_LINE, 'max-w-2xl')}>
					<InformationCircle aria-hidden="true" className="mt-px size-3.5 shrink-0" />
					<span>{t('dashboard.appsUrls.SPLIT_NOTE')}</span>
				</p>
				<p className="text-xs text-muted-foreground">{t('dashboard.appsUrls.MOSAIC_HINT')}</p>
			</div>
			{isCapped && (
				<p className={NOTE_LINE}>
					<InformationCircle aria-hidden="true" className="mt-px size-3.5 shrink-0" />
					<span>{t('dashboard.appsUrls.CAPPED_NOTE', { count: ACTIVITY_REPORT_ROW_CAP })}</span>
				</p>
			)}
		</div>
	);
}

function SplitBandSkeleton() {
	const t = useTranslations();
	return (
		<div className="flex flex-col gap-3 px-4 pt-3 pb-2" aria-hidden="true">
			<div className="flex flex-col gap-1.5">
				<span className="text-xs text-muted-foreground">{t('dashboard.appsUrls.TIME_LABEL')}</span>
				<span className="flex items-center gap-2">
					<span className={cn('h-4 w-20', SKELETON_BAR)} />
					<span className={cn('h-2.5 w-44', SKELETON_BAR)} />
				</span>
			</div>
			<span className={cn('block h-2 w-full', SKELETON_BAR)} />
			<div className={LEGEND_GRID}>
				{[62, 48, 54, 70].map((width) => (
					<span key={width} className="flex min-h-8 items-center gap-2">
						<span className="size-2 shrink-0 rounded-full bg-foreground/[0.08]" />
						<span className={cn('h-2.5', SKELETON_BAR)} style={{ width: `${width}%` }} />
					</span>
				))}
			</div>
		</div>
	);
}

function OverviewNotesSkeleton() {
	return (
		<div className="flex items-center justify-between gap-6 px-4 py-2.5" aria-hidden="true">
			<span className={cn('h-2.5 w-full max-w-xl', SKELETON_BAR)} />
			<span className={cn('h-2.5 w-52 shrink-0 max-sm:hidden', SKELETON_BAR)} />
		</div>
	);
}

/** Drawn by the route skeleton and by the page on its first load: the same frame from the route to the data. */
export function AppsUrlsOverviewSkeleton() {
	return (
		<section className={DASHBOARD_SURFACE}>
			<SplitBandSkeleton />
			<div className="pt-1.5">
				<AppsUrlsMosaicSkeleton />
			</div>
			<OverviewNotesSkeleton />
		</section>
	);
}

/** The split bar replaces a productivity split: Gauzy rates no app or site and does not tell one from the other. */
export const AppsUrlsOverview = memo(function AppsUrlsOverview({
	figures,
	splitRows,
	items,
	pickedKey,
	onPick,
	isLoading,
	isUnavailable,
	isCapped,
	errorNotice,
	emptyState
}: Readonly<{
	figures: UsageFigures;
	splitRows: ReadonlyArray<ShareRow<TitleTotal>>;
	items: ReadonlyArray<MosaicItem>;
	pickedKey: string | null;
	onPick: (key: string) => void;
	isLoading: boolean;
	isUnavailable: boolean;
	isCapped: boolean;
	errorNotice: ReactNode;
	emptyState: ReactNode;
}>) {
	const hasTiles = items.length > 0;
	const isAvailable = !isUnavailable;
	const showsMosaic = hasTiles && isAvailable;
	const showsEmpty = !hasTiles && isAvailable;

	if (isLoading) {
		return <AppsUrlsOverviewSkeleton />;
	}

	return (
		<section className={DASHBOARD_SURFACE}>
			{!showsEmpty && <SplitBand figures={figures} splitRows={splitRows} isUnavailable={isUnavailable} />}
			<div className="pt-1.5">
				{showsMosaic && <AppsUrlsMosaic items={items} pickedKey={pickedKey} onPick={onPick} />}
				{showsEmpty && <AppsUrlsMosaicMessage>{emptyState}</AppsUrlsMosaicMessage>}
				{isUnavailable && <AppsUrlsMosaicMessage>{errorNotice}</AppsUrlsMosaicMessage>}
			</div>
			{showsMosaic && <OverviewNotes isCapped={isCapped} />}
		</section>
	);
});
