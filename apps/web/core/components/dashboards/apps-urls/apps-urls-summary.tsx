'use client';

import { memo, useMemo, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { ActivityIcon } from '@/core/components/activities/activity-icon';
import { MetricStrip, type MetricItem } from '@/core/components/dashboards/kit/metric-strip';
import { ShareBar, ShareRows } from '@/core/components/dashboards/kit/share-rows';
import {
	DASHBOARD_SURFACE,
	SECTION_HEADER,
	SECTION_META,
	SECTION_TITLE,
	SKELETON_BAR
} from '@/core/components/dashboards/kit/recipes';
import { InformationCircle } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort, formatPercent, shareRowsOf } from '@/core/lib/utils/dashboard-figures';
import {
	ACTIVITY_REPORT_ROW_CAP,
	LEADING_TITLE_COUNT,
	type TitleTotal,
	type UsageFigures
} from '@/core/lib/utils/dashboards/apps-urls';

type FigureKey = 'time' | 'titles' | 'members' | 'top';

/** The ranked list stops here and closes with one "N other apps and sites" row. */
const RANKED_TITLE_COUNT = 8;

const MISSING_VALUE = '–';

function titleTotalKeyOf(total: TitleTotal) {
	return total.key;
}

function titleTotalSecondsOf(total: TitleTotal) {
	return total.seconds;
}

function averageSecondsOf(figures: UsageFigures) {
	if (!figures.memberCount) {
		return 0;
	}
	return figures.totalSeconds / figures.memberCount;
}

function unavailableItems(labels: Record<FigureKey, string>): MetricItem<FigureKey>[] {
	return [
		{ key: 'time', label: labels.time, value: MISSING_VALUE },
		{ key: 'titles', label: labels.titles, value: MISSING_VALUE },
		{ key: 'members', label: labels.members, value: MISSING_VALUE },
		{ key: 'top', label: labels.top, value: MISSING_VALUE }
	];
}

function hintWhen(isShown: boolean, buildHint: () => string) {
	if (!isShown) {
		return undefined;
	}
	return buildHint();
}

function figureLabelsOf(t: ReturnType<typeof useTranslations>): Record<FigureKey, string> {
	return {
		time: t('dashboard.appsUrls.TIME_LABEL'),
		titles: t('dashboard.appsUrls.TITLES_LABEL'),
		members: t('common.MEMBERS'),
		top: t('dashboard.appsUrls.TOP_LABEL')
	};
}

function useFigureItems(figures: UsageFigures, isUnavailable: boolean): MetricItem<FigureKey>[] {
	const t = useTranslations();
	return useMemo(() => {
		const labels = figureLabelsOf(t);
		if (isUnavailable) {
			return unavailableItems(labels);
		}
		const hasDays = figures.dayCount > 0;
		const hasMoreThanLeading = figures.titleCount > LEADING_TITLE_COUNT;
		const hasSeveralMembers = figures.memberCount > 1;
		const averageDuration = formatDurationShort(averageSecondsOf(figures));
		const leadingShare = formatPercent(figures.leadingShare);

		return [
			{
				key: 'time',
				label: labels.time,
				value: formatDurationShort(figures.totalSeconds),
				hint: hintWhen(hasDays, () => t('dashboard.appsUrls.TIME_HINT', { count: figures.dayCount }))
			},
			{
				key: 'titles',
				label: labels.titles,
				value: figures.titleCount,
				hint: hintWhen(hasMoreThanLeading, () => t('dashboard.appsUrls.TITLES_HINT', { share: leadingShare }))
			},
			{
				key: 'members',
				label: labels.members,
				value: figures.memberCount,
				hint: hintWhen(hasSeveralMembers, () =>
					t('dashboard.appsUrls.MEMBERS_HINT', { duration: averageDuration })
				)
			},
			topItemOf(figures, labels.top, t)
		];
	}, [figures, isUnavailable, t]);
}

function topItemOf(figures: UsageFigures, label: string, t: ReturnType<typeof useTranslations>): MetricItem<FigureKey> {
	const top = figures.top;
	if (!top) {
		return { key: 'top', label, value: MISSING_VALUE };
	}
	const topTitle = top.title || t('dashboard.appsUrls.UNTITLED');
	const hint = t('dashboard.appsUrls.TOP_HINT', {
		share: formatPercent(figures.topShare),
		duration: formatDurationShort(top.seconds)
	});
	return { key: 'top', label, value: <span title={topTitle}>{topTitle}</span>, hint };
}

function ShareListSkeleton() {
	return (
		<div aria-hidden="true">
			<div className="px-4 pb-3">
				<span className={cn('block h-1.5 w-full', SKELETON_BAR)} />
			</div>
			<div className="hairline-t border-border">
				{[72, 58, 46, 38, 30].map((width) => (
					<div
						key={width}
						className="grid min-h-10 grid-cols-[2.75rem_minmax(0,1fr)_5rem] items-center gap-x-3 px-4 sm:grid-cols-[2.75rem_minmax(0,1fr)_minmax(4rem,9rem)_5.5rem]"
					>
						<span className={cn('h-2.5 w-7', SKELETON_BAR)} />
						<span className={cn('h-2.5', SKELETON_BAR)} style={{ width: `${width}%` }} />
						<span className={cn('h-1 w-full max-sm:hidden', SKELETON_BAR)} />
						<span className={cn('ml-auto h-2.5 w-12', SKELETON_BAR)} />
					</div>
				))}
			</div>
		</div>
	);
}

function ShareSectionHeader({ meta }: Readonly<{ meta?: string | null }>) {
	const t = useTranslations();
	return (
		<header className={SECTION_HEADER}>
			<div className="flex min-w-0 items-baseline gap-2">
				<h2 className={SECTION_TITLE}>{t('dashboard.appsUrls.SHARE_TITLE')}</h2>
				{meta && <span className={SECTION_META}>{meta}</span>}
			</div>
		</header>
	);
}

/** Drawn by the route skeleton and by the page on its first load: one picture from the route to the data. */
export function AppsUrlsSummarySkeleton() {
	const t = useTranslations();
	const items = useMemo(() => unavailableItems(figureLabelsOf(t)), [t]);
	return (
		<section className={DASHBOARD_SURFACE}>
			<MetricStrip items={items} ariaLabel={t('dashboard.appsUrls.FIGURES_LABEL')} isLoading />
			<div className="hairline-t border-border">
				<ShareSectionHeader />
				<ShareListSkeleton />
			</div>
		</section>
	);
}

function ProductivityNote() {
	const t = useTranslations();
	return <p className="text-xs text-muted-foreground">{t('dashboard.PRODUCTIVITY_SPLIT_UNAVAILABLE')}</p>;
}

function ShareTitleName({ total, untitledLabel }: Readonly<{ total: TitleTotal; untitledLabel: string }>) {
	if (!total.title) {
		return <span className="truncate text-muted-foreground">{untitledLabel}</span>;
	}
	return (
		<span className="flex min-w-0 items-center gap-2" title={total.title}>
			<ActivityIcon title={total.title} kind={total.kind} url={total.url} />
			<span className="truncate">{total.title}</span>
		</span>
	);
}

/**
 * The period at a glance, in one surface: the figures, then where the time went as one stacked bar (the three
 * longest in brand tones, in the order of the list under it) and the ranked apps and sites
 * ("47% · Figma · meter · 2h 58m"), capped with "N other apps and sites".
 */
export const AppsUrlsSummary = memo(function AppsUrlsSummary({
	figures,
	titleTotals,
	isLoading,
	isUnavailable,
	isCapped,
	errorNotice
}: Readonly<{
	figures: UsageFigures;
	titleTotals: ReadonlyArray<TitleTotal>;
	isLoading: boolean;
	isUnavailable: boolean;
	isCapped: boolean;
	errorNotice?: ReactNode;
}>) {
	const t = useTranslations();
	const items = useFigureItems(figures, isUnavailable);
	const leadingRows = useMemo(
		() => shareRowsOf(titleTotals, titleTotalSecondsOf, titleTotalKeyOf, LEADING_TITLE_COUNT),
		[titleTotals]
	);
	const rankedRows = useMemo(
		() => shareRowsOf(titleTotals, titleTotalSecondsOf, titleTotalKeyOf, RANKED_TITLE_COUNT),
		[titleTotals]
	);
	const untitledLabel = t('dashboard.appsUrls.UNTITLED');
	const hasTitles = titleTotals.length > 0;
	const isAvailable = !isUnavailable;
	const isEmpty = !hasTitles;
	const showsRanking = hasTitles;
	const showsEmptyTrack = isEmpty && isAvailable;

	if (isLoading) {
		return <AppsUrlsSummarySkeleton />;
	}

	let shareMeta: string | null = null;
	if (showsRanking) {
		shareMeta = t('dashboard.appsUrls.TITLE_COUNT', { count: titleTotals.length });
	}

	return (
		<section className={DASHBOARD_SURFACE}>
			<MetricStrip items={items} ariaLabel={t('dashboard.appsUrls.FIGURES_LABEL')} />
			<div className="hairline-t border-border">
				<ShareSectionHeader meta={shareMeta} />
				{errorNotice && <div className="px-4 pb-4">{errorNotice}</div>}
				{showsEmptyTrack && (
					<div className="flex flex-col gap-2 px-4 pb-4">
						<span aria-hidden="true" className="block h-1.5 w-full rounded-full bg-foreground/[0.06]" />
						<ProductivityNote />
					</div>
				)}
				{showsRanking && (
					<>
						<div className="flex flex-col gap-2 px-4 pb-3">
							<ShareBar rows={leadingRows} />
							<ProductivityNote />
						</div>
						<ShareRows
							rows={rankedRows}
							className="hairline-t border-border"
							renderName={(total) => <ShareTitleName total={total} untitledLabel={untitledLabel} />}
							formatValue={formatDurationShort}
							otherLabel={(count) => t('dashboard.appsUrls.OTHER_TITLES', { count })}
						/>
					</>
				)}
				{isCapped && (
					<p className="flex items-center gap-2 px-4 py-2.5 text-xs text-muted-foreground hairline-t border-border">
						<InformationCircle aria-hidden="true" className="size-3.5 shrink-0" />
						<span>{t('dashboard.appsUrls.CAPPED_NOTE', { count: ACTIVITY_REPORT_ROW_CAP })}</span>
					</p>
				)}
			</div>
		</section>
	);
});
