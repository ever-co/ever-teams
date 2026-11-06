'use client';

import type { ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ShareMeter } from '@/core/components/dashboards/kit/meters';
import { DASHBOARD_SURFACE, SECTION_TITLE, SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { dataColorDotStyle, isPaintableColor } from '@/core/components/tasks/task-data-color';
import { Folder, Pencil, Plus } from '@/core/components/icons';
import type { TrackedShare } from '@/core/hooks/dashboards/manual-time-edits/use-manual-time-edits-report';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import {
	type EditsFigures,
	type ManualRankings,
	type ManualRankRow,
	sharePercentTextOf
} from '@/core/lib/utils/dashboards/manual-time-edits';
import { FeedFace } from './manual-time-edit-entry';
import { SUMMARY_RAIL, SUMMARY_RAIL_BODY } from './manual-time-edits-feed-layout';

type Translate = ReturnType<typeof useTranslations>;

const MISSING_VALUE = '–';

const BAR_HEIGHT = 'h-2';

const VALUE = 'text-[13px] font-medium tabular-nums text-foreground';

const RANK_GRID = 'grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1 py-1.5';

function SharePercent({ share }: Readonly<{ share: TrackedShare }>) {
	const locale = useLocale();
	if (share.status === 'loading') {
		return <span aria-hidden="true" className={cn('h-4 w-10', SKELETON_BAR)} />;
	}
	let text = MISSING_VALUE;
	if (share.status === 'ready') {
		text = sharePercentTextOf(share.percent, locale);
	}
	return <span className="text-lg font-semibold tabular-nums text-foreground">{text}</span>;
}

function ShareBar({ share }: Readonly<{ share: TrackedShare }>) {
	if (share.status === 'ready') {
		return <ShareMeter share={share.percent} className={BAR_HEIGHT} />;
	}
	if (share.status === 'loading') {
		return <span aria-hidden="true" className={cn('block w-full', BAR_HEIGHT, SKELETON_BAR)} />;
	}
	return <span aria-hidden="true" className={cn('block w-full rounded-full bg-foreground/[0.07]', BAR_HEIGHT)} />;
}

function TrackedValue({ share }: Readonly<{ share: TrackedShare }>) {
	if (share.status === 'ready') {
		return <>{formatDurationShort(share.trackedSeconds)}</>;
	}
	if (share.status === 'loading') {
		return <span aria-hidden="true" className={cn('inline-block h-2.5 w-12 align-middle', SKELETON_BAR)} />;
	}
	return <>{MISSING_VALUE}</>;
}

function shareNoteOf(share: TrackedShare, t: Translate) {
	if (share.status === 'billable-filter') {
		return t('dashboard.manualTimeEdits.SHARE_NO_BILLABLE_SPLIT');
	}
	if (share.status === 'no-time') {
		return t('dashboard.manualTimeEdits.SHARE_NO_TRACKED_TIME');
	}
	if (share.status === 'unavailable') {
		return t('dashboard.manualTimeEdits.SHARE_UNAVAILABLE');
	}
	return null;
}

function LegendItem({
	toneClassName,
	label,
	children,
	className
}: Readonly<{ toneClassName: string; label: string; children: ReactNode; className?: string }>) {
	return (
		<div className={cn('flex min-w-0 flex-col gap-0.5', className)}>
			<dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
				<span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', toneClassName)} />
				<span className="truncate">{label}</span>
			</dt>
			<dd className={VALUE}>{children}</dd>
		</div>
	);
}

function ChangeRow({
	icon,
	label,
	seconds,
	count
}: Readonly<{ icon: ReactNode; label: string; seconds: number; count: number }>) {
	const t = useTranslations();
	return (
		<div className="flex items-center gap-2 text-xs">
			<dt className="flex min-w-0 flex-1 items-center gap-1.5 text-muted-foreground [&_svg]:size-3.5 [&_svg]:shrink-0">
				{icon}
				<span className="truncate">{label}</span>
			</dt>
			<dd className="shrink-0 tabular-nums text-muted-foreground">
				{t('dashboard.manualTimeEdits.ENTRIES_COUNT', { count })}
			</dd>
			<dd className={cn('w-16 shrink-0 text-right', VALUE)}>{formatDurationShort(seconds)}</dd>
		</div>
	);
}

function ManualShareBlock({ figures, share }: Readonly<{ figures: EditsFigures; share: TrackedShare }>) {
	const t = useTranslations();
	const note = shareNoteOf(share, t);
	return (
		<section className="flex flex-col gap-3 px-4 pt-4 pb-3">
			<header className="flex min-h-6 items-center justify-between gap-3">
				<h2 className={SECTION_TITLE}>{t('dashboard.manualTimeEdits.FIGURE_SHARE')}</h2>
				<SharePercent share={share} />
			</header>
			<ShareBar share={share} />
			<dl className="grid grid-cols-2 gap-x-3">
				<LegendItem toneClassName="bg-primary/80" label={t('dashboard.manualTimeEdits.LEGEND_MANUAL')}>
					{formatDurationShort(figures.manualSeconds)}
				</LegendItem>
				<LegendItem
					toneClassName="bg-foreground/[0.12]"
					label={t('dashboard.manualTimeEdits.LEGEND_TRACKED')}
					className="items-end text-right"
				>
					<TrackedValue share={share} />
				</LegendItem>
			</dl>
			{note && <p className="text-xs text-muted-foreground text-pretty">{note}</p>}
			<dl className="flex flex-col gap-1.5 pt-1">
				<ChangeRow
					icon={<Plus aria-hidden="true" className="text-primary-ink" />}
					label={t('dashboard.manualTimeEdits.FIGURE_ADDED')}
					seconds={figures.addedSeconds}
					count={figures.addedCount}
				/>
				<ChangeRow
					icon={<Pencil aria-hidden="true" className="text-warning-foreground" />}
					label={t('dashboard.manualTimeEdits.FIGURE_EDITED')}
					seconds={figures.editedSeconds}
					count={figures.editedCount}
				/>
			</dl>
		</section>
	);
}

function OtherMark() {
	return <span aria-hidden="true" className="ml-1.5 block size-2 rounded-full bg-foreground/15" />;
}

function MemberLead({ row }: Readonly<{ row: ManualRankRow }>) {
	const item = row.item;
	if (!item) {
		return <OtherMark />;
	}
	return <FeedFace name={item.name ?? ''} imageUrl={item.imageUrl} />;
}

function ProjectLead({ row }: Readonly<{ row: ManualRankRow }>) {
	const item = row.item;
	if (!item) {
		return <OtherMark />;
	}
	if (!item.name) {
		return <Folder aria-hidden="true" className="ml-0.5 size-4 text-muted-foreground" />;
	}
	const color = item.color;
	if (!isPaintableColor(color)) {
		return <span aria-hidden="true" className="ml-1.5 block size-2 rounded-full bg-foreground/25" />;
	}
	return <span aria-hidden="true" className="ml-1.5 block size-2 rounded-full" style={dataColorDotStyle(color)} />;
}

function RankName({ text, isMuted }: Readonly<{ text: string; isMuted: boolean }>) {
	return (
		<span className={cn('truncate text-[13px] text-foreground', isMuted && 'text-muted-foreground')}>{text}</span>
	);
}

function RankRow({ row, lead, name }: Readonly<{ row: ManualRankRow; lead: ReactNode; name: ReactNode }>) {
	const t = useTranslations();
	return (
		<li className={RANK_GRID}>
			<span className="row-span-2 flex size-5 items-center self-start">{lead}</span>
			{name}
			<span className={cn('text-right', VALUE)}>{formatDurationShort(row.seconds)}</span>
			<ShareMeter share={row.share} />
			<span className="text-right text-xs tabular-nums text-muted-foreground">
				{t('dashboard.manualTimeEdits.ENTRIES_COUNT', { count: row.count })}
			</span>
		</li>
	);
}

function memberNameOf(row: ManualRankRow, t: Translate) {
	const item = row.item;
	if (!item) {
		return t('dashboard.manualTimeEdits.RANK_OTHER_MEMBERS', { count: row.otherCount });
	}
	return item.name ?? '';
}

function projectNameOf(row: ManualRankRow, t: Translate) {
	const item = row.item;
	if (!item) {
		return t('dashboard.manualTimeEdits.RANK_OTHER_PROJECTS', { count: row.otherCount });
	}
	return item.name ?? t('dashboard.timesheets.NO_PROJECT');
}

function isMutedRow(row: ManualRankRow) {
	const isOther = row.item === null;
	const hasNoName = !row.item?.name;
	return isOther || hasNoName;
}

function RankedBlock({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
	return (
		<section className="flex flex-col gap-1 px-4 pt-3 pb-2">
			<h2 className={SECTION_TITLE}>{title}</h2>
			<ul className="flex flex-col">{children}</ul>
		</section>
	);
}

/** Built on the same entries as the lead sentence, so switching between All, Added and Edited leaves it still. */
export function ManualTimeEditsSummaryRail({
	figures,
	share,
	rankings,
	isLoading
}: Readonly<{ figures: EditsFigures; share: TrackedShare; rankings: ManualRankings; isLoading: boolean }>) {
	const t = useTranslations();
	const hasEntries = figures.entryCount > 0;
	if (isLoading) {
		return <ManualTimeEditsSummaryRailSkeleton />;
	}
	return (
		<aside aria-label={t('dashboard.manualTimeEdits.RAIL_LABEL')} className={cn(DASHBOARD_SURFACE, SUMMARY_RAIL)}>
			<div className={SUMMARY_RAIL_BODY}>
				<ManualShareBlock figures={figures} share={share} />
				{hasEntries && (
					<RankedBlock title={t('dashboard.manualTimeEdits.RANK_MEMBERS_TITLE')}>
						{rankings.members.map((row) => (
							<RankRow
								key={row.key}
								row={row}
								lead={<MemberLead row={row} />}
								name={<RankName text={memberNameOf(row, t)} isMuted={row.item === null} />}
							/>
						))}
					</RankedBlock>
				)}
				{hasEntries && (
					<RankedBlock title={t('dashboard.timesheets.PROJECTS')}>
						{rankings.projects.map((row) => (
							<RankRow
								key={row.key}
								row={row}
								lead={<ProjectLead row={row} />}
								name={<RankName text={projectNameOf(row, t)} isMuted={isMutedRow(row)} />}
							/>
						))}
					</RankedBlock>
				)}
			</div>
		</aside>
	);
}

const SKELETON_RANK_WIDTHS = ['w-24', 'w-20', 'w-28', 'w-16'];

function RankRowsSkeleton({ isRound }: Readonly<{ isRound: boolean }>) {
	return (
		<span className="flex flex-col">
			{SKELETON_RANK_WIDTHS.map((width) => (
				<span key={width} className={RANK_GRID}>
					<span
						className={cn(
							'row-span-2 size-5 self-start rounded-full bg-foreground/[0.06]',
							!isRound && 'scale-50'
						)}
					/>
					<span className={cn('h-2.5', width, SKELETON_BAR)} />
					<span className={cn('ml-auto h-2.5 w-10', SKELETON_BAR)} />
					<span className="block h-1 w-full rounded-full bg-foreground/[0.07]" />
					<span className={cn('ml-auto h-2 w-12', SKELETON_BAR)} />
				</span>
			))}
		</span>
	);
}

export function ManualTimeEditsSummaryRailSkeleton() {
	const t = useTranslations();
	return (
		<div aria-hidden="true" className={cn(DASHBOARD_SURFACE, SUMMARY_RAIL)}>
			<div className={SUMMARY_RAIL_BODY}>
				<span className="flex flex-col gap-3 px-4 pt-4 pb-3">
					<span className="flex min-h-6 items-center justify-between gap-3">
						<span className={SECTION_TITLE}>{t('dashboard.manualTimeEdits.FIGURE_SHARE')}</span>
						<span className={cn('h-4 w-10', SKELETON_BAR)} />
					</span>
					<span className={cn('block w-full', BAR_HEIGHT, SKELETON_BAR)} />
					<span className="flex justify-between gap-3">
						<span className={cn('h-2.5 w-16', SKELETON_BAR)} />
						<span className={cn('h-2.5 w-16', SKELETON_BAR)} />
					</span>
					<span className="flex flex-col gap-2 pt-1">
						<span className={cn('h-2.5 w-full', SKELETON_BAR)} />
						<span className={cn('h-2.5 w-full', SKELETON_BAR)} />
					</span>
				</span>
				<span className="flex flex-col gap-1 px-4 pt-3 pb-2">
					<span className={SECTION_TITLE}>{t('dashboard.manualTimeEdits.RANK_MEMBERS_TITLE')}</span>
					<RankRowsSkeleton isRound />
				</span>
				<span className="flex flex-col gap-1 px-4 pt-3 pb-2">
					<span className={SECTION_TITLE}>{t('dashboard.timesheets.PROJECTS')}</span>
					<RankRowsSkeleton isRound={false} />
				</span>
			</div>
		</div>
	);
}
