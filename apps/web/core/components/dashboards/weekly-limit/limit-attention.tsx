'use client';

import { memo, useCallback, useId, useState, type ReactNode } from 'react';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { AnimatedHeight } from '@/core/components/common/animated-height';
import { DashboardSection } from '@/core/components/dashboards/kit/dashboard-layout';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { CheckCircle2, ChevronDown, ChevronUp } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort, formatHoursLabel } from '@/core/lib/utils/dashboard-figures';
import type { AttentionVerdict, LimitAttention, LimitDuration } from '@/core/lib/utils/dashboards/weekly-limit';
import { MemberFace } from './limit-cells';

/** The list stays short enough to read at a glance; the rest opens in place. */
const VISIBLE_COUNT = 5;

const OVER_KEYS: Record<LimitDuration, DottedLanguageObjectStringPaths> = {
	day: 'dashboard.weeklyLimit.ATTENTION_OVER_DAYS',
	week: 'dashboard.weeklyLimit.ATTENTION_OVER_WEEKS'
};

const NEAR_KEYS: Record<LimitDuration, DottedLanguageObjectStringPaths> = {
	day: 'dashboard.weeklyLimit.ATTENTION_NEAR_DAYS',
	week: 'dashboard.weeklyLimit.ATTENTION_NEAR_WEEKS'
};

const DOT_TONES: Record<AttentionVerdict, string> = {
	over: 'bg-destructive',
	near: 'bg-warning'
};

const SEPARATOR = (
	<span aria-hidden="true" className="text-muted-foreground">
		·
	</span>
);

function strongFigure(chunks: ReactNode) {
	return <span className="font-medium text-foreground">{chunks}</span>;
}

function OverPart({ item, duration }: Readonly<{ item: LimitAttention; duration: LimitDuration }>) {
	const t = useTranslations();
	const overrun = formatDurationShort(item.overrun);
	return (
		<span className="text-destructive-ink">
			{t(OVER_KEYS[duration], { duration: overrun, count: item.flaggedCount })}
		</span>
	);
}

function NearPart({ count, duration }: Readonly<{ count: number; duration: LimitDuration }>) {
	const t = useTranslations();
	return <span className="text-warning-foreground">{t(NEAR_KEYS[duration], { count })}</span>;
}

const AttentionLine = memo(function AttentionLine({
	item,
	duration,
	isHighlighted,
	hintId,
	onToggle
}: Readonly<{
	item: LimitAttention;
	duration: LimitDuration;
	isHighlighted: boolean;
	hintId: string;
	onToggle: (key: string) => void;
}>) {
	const t = useTranslations();
	const isOver = item.verdict === 'over';
	const hasNear = item.nearCount > 0;
	const showsNearAfterOver = isOver && hasNear;
	const handleClick = useCallback(() => onToggle(item.key), [item.key, onToggle]);
	const used = formatDurationShort(item.used);
	const limit = formatHoursLabel(item.limit);
	return (
		<li>
			<button
				type="button"
				aria-pressed={isHighlighted}
				aria-describedby={hintId}
				onClick={handleClick}
				className={cn(
					'flex w-full min-w-0 items-start gap-2.5 rounded-md px-2 py-2 text-left outline-none transition-colors hover:bg-foreground/[0.03] focus-visible:ring-[3px] focus-visible:ring-ring/25',
					isHighlighted && 'bg-foreground/[0.03]'
				)}
			>
				<span className="flex h-5 shrink-0 items-center gap-2">
					<span aria-hidden="true" className={cn('size-1.5 rounded-full', DOT_TONES[item.verdict])} />
					<MemberFace name={item.member.name} imageUrl={item.member.imageUrl} size="sm" />
				</span>
				<span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-[13px] leading-5 tabular-nums">
					<span className="max-w-full truncate font-medium text-foreground">{item.member.name}</span>
					{SEPARATOR}
					<span className="text-muted-foreground">
						{t.rich('dashboard.weeklyLimit.ATTENTION_USED_OF', { used, limit, strong: strongFigure })}
					</span>
					{SEPARATOR}
					{isOver && <OverPart item={item} duration={duration} />}
					{!isOver && <NearPart count={item.flaggedCount} duration={duration} />}
					{showsNearAfterOver && (
						<>
							{SEPARATOR}
							<NearPart count={item.nearCount} duration={duration} />
						</>
					)}
				</span>
			</button>
		</li>
	);
});

function toggleLabelOf(isExpanded: boolean, total: number, t: ReturnType<typeof useTranslations>) {
	if (isExpanded) {
		return t('dashboard.weeklyLimit.ATTENTION_SHOW_FEWER');
	}
	return t('dashboard.weeklyLimit.ATTENTION_SHOW_ALL', { count: total });
}

function visibleItemsOf(items: ReadonlyArray<LimitAttention>, isExpanded: boolean) {
	if (isExpanded) {
		return items;
	}
	return items.slice(0, VISIBLE_COUNT);
}

function CalmLine() {
	const t = useTranslations();
	return (
		<p className="flex items-center gap-2 px-4 py-3 text-[13px] text-muted-foreground">
			<CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-success-foreground" />
			<span>{t('dashboard.weeklyLimit.ATTENTION_NONE')}</span>
		</p>
	);
}

/**
 * The members over or near their limit in the period, before the matrix: who, how much and on how many days. A line
 * marks its member's row in the heatmap below, so the days follow from the name.
 */
export function LimitAttentionList({
	items,
	duration,
	highlightedKey,
	onHighlight
}: Readonly<{
	items: ReadonlyArray<LimitAttention>;
	duration: LimitDuration;
	highlightedKey: string | null;
	onHighlight: (key: string) => void;
}>) {
	const t = useTranslations();
	const hintId = useId();
	const [isExpanded, setIsExpanded] = useState(false);
	const total = items.length;
	const hasItems = total > 0;
	const canExpand = total > VISIBLE_COUNT;
	const visibleItems = visibleItemsOf(items, isExpanded);
	const title = t('dashboard.weeklyLimit.ATTENTION_TITLE');
	const meta = t('dashboard.weeklyLimit.MEMBERS_COUNT', { count: total });
	const toggleExpanded = useCallback(() => setIsExpanded((current) => !current), []);

	return (
		<DashboardSection title={title} meta={hasItems && meta} ariaLabel={title}>
			{!hasItems && <CalmLine />}
			{hasItems && (
				<div className="px-2 py-1.5">
					<AnimatedHeight>
						<ul className="grid gap-x-4 lg:grid-cols-2">
							{visibleItems.map((item) => (
								<AttentionLine
									key={item.key}
									item={item}
									duration={duration}
									isHighlighted={item.key === highlightedKey}
									hintId={hintId}
									onToggle={onHighlight}
								/>
							))}
						</ul>
					</AnimatedHeight>
					{canExpand && (
						<button
							type="button"
							aria-expanded={isExpanded}
							onClick={toggleExpanded}
							className="mt-0.5 flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25"
						>
							{isExpanded && <ChevronUp aria-hidden="true" className="size-3.5" />}
							{!isExpanded && <ChevronDown aria-hidden="true" className="size-3.5" />}
							<span>{toggleLabelOf(isExpanded, total, t)}</span>
						</button>
					)}
					<span id={hintId} className="sr-only">
						{t('dashboard.weeklyLimit.ATTENTION_ROW_HINT')}
					</span>
				</div>
			)}
		</DashboardSection>
	);
}

const SKELETON_LINES = [64, 52, 58];

export function LimitAttentionSkeleton() {
	const t = useTranslations();
	const title = t('dashboard.weeklyLimit.ATTENTION_TITLE');
	return (
		<DashboardSection title={title} ariaLabel={title}>
			<ul aria-hidden="true" className="grid gap-x-4 px-2 py-1.5 lg:grid-cols-2">
				{SKELETON_LINES.map((width, index) => (
					<li key={index} className="flex min-h-9 items-center gap-2.5 px-2">
						<span className="size-1.5 rounded-full bg-foreground/[0.08]" />
						<span className="size-5 shrink-0 animate-pulse rounded-full bg-foreground/[0.06]" />
						<span className={cn('h-2.5', SKELETON_BAR)} style={{ width: `${width}%` }} />
					</li>
				))}
			</ul>
		</DashboardSection>
	);
}
