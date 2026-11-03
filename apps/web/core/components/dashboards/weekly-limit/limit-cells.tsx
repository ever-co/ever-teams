'use client';

import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/components/common/avatar';
import { LimitMeter, limitVerdictTextClassOf } from '@/core/components/dashboards/kit/meters';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort, formatHoursLabel, type LimitVerdict } from '@/core/lib/utils/dashboard-figures';
import { limitShareLabelOf } from '@/core/lib/utils/dashboards/weekly-limit';

export const VERDICT_LABEL_KEYS: Record<LimitVerdict, DottedLanguageObjectStringPaths> = {
	within: 'dashboard.weeklyLimit.VERDICT_WITHIN',
	near: 'dashboard.weeklyLimit.VERDICT_NEAR',
	over: 'dashboard.weeklyLimit.VERDICT_OVER'
};

const MISSING_FIGURE = '–';

const FIGURE_TEXT = 'truncate text-right text-[13px] tabular-nums';

export interface LimitFigure {
	used: number;
	limit: number;
	hasLimit: boolean;
	share: number;
	verdict: LimitVerdict;
	remaining: number;
}

function limitTextOf(limit: number, hasLimit: boolean) {
	if (!hasLimit) {
		return MISSING_FIGURE;
	}
	return formatHoursLabel(limit);
}

function shareTextOf(figure: LimitFigure) {
	if (!figure.hasLimit) {
		return MISSING_FIGURE;
	}
	return limitShareLabelOf(figure.share, figure.verdict);
}

export function UsedValue({ figure, className }: Readonly<{ figure: LimitFigure; className?: string }>) {
	const limitText = limitTextOf(figure.limit, figure.hasLimit);
	return (
		<span className={cn(FIGURE_TEXT, className)}>
			<span className="text-foreground">{formatDurationShort(figure.used)}</span>
			<span className="text-muted-foreground">{` / ${limitText}`}</span>
		</span>
	);
}

export function VerdictText({ figure, className }: Readonly<{ figure: LimitFigure; className?: string }>) {
	const t = useTranslations();
	if (!figure.hasLimit) {
		return (
			<span className={cn('truncate text-[13px] text-muted-foreground', className)}>
				{t('dashboard.weeklyLimit.NO_LIMIT')}
			</span>
		);
	}
	return (
		<span className={cn('truncate text-[13px]', limitVerdictTextClassOf(figure.verdict), className)}>
			{t(VERDICT_LABEL_KEYS[figure.verdict])}
		</span>
	);
}

/** Phones hide the status column, so the verdict follows the percentage there. */
export function LimitShare({ figure, className }: Readonly<{ figure: LimitFigure; className?: string }>) {
	return (
		<span className={cn('flex min-w-0 items-center gap-3', className)}>
			{figure.hasLimit && <LimitMeter used={figure.used} limit={figure.limit} className="min-w-0 flex-1" />}
			{!figure.hasLimit && (
				<span aria-hidden="true" className="block h-3 min-w-16 flex-1 rounded-[2px] bg-foreground/6" />
			)}
			<span className="w-12 shrink-0 text-right text-[13px] tabular-nums text-foreground">
				{shareTextOf(figure)}
			</span>
			<VerdictText figure={figure} className="shrink-0 md:hidden" />
		</span>
	);
}

export function RemainingValue({ figure, className }: Readonly<{ figure: LimitFigure; className?: string }>) {
	const t = useTranslations();
	const isOver = figure.remaining < 0;
	if (!figure.hasLimit) {
		return <span className={cn(FIGURE_TEXT, 'text-muted-foreground', className)}>{MISSING_FIGURE}</span>;
	}
	if (isOver) {
		const overrun = formatDurationShort(-figure.remaining);
		return (
			<span className={cn(FIGURE_TEXT, 'text-destructive-ink', className)}>
				{t('dashboard.weeklyLimit.REMAINING_OVER', { duration: overrun })}
			</span>
		);
	}
	return (
		<span className={cn(FIGURE_TEXT, 'text-foreground', className)}>{formatDurationShort(figure.remaining)}</span>
	);
}

const COUNT_CHIP = 'inline-flex h-5 items-center rounded-md px-1.5 text-xs font-medium tabular-nums';

export function VerdictCounts({
	overCount,
	nearCount,
	className
}: Readonly<{ overCount: number; nearCount: number; className?: string }>) {
	const t = useTranslations();
	const hasOver = overCount > 0;
	const hasNear = nearCount > 0;
	const hasAny = hasOver || hasNear;
	if (!hasAny) {
		return null;
	}
	return (
		<span className={cn('flex flex-wrap items-center gap-1.5', className)}>
			{hasOver && (
				<span className={cn(COUNT_CHIP, 'bg-destructive/10 text-destructive-ink')}>
					{t('dashboard.weeklyLimit.GROUP_OVER', { count: overCount })}
				</span>
			)}
			{hasNear && (
				<span className={cn(COUNT_CHIP, 'bg-warning/10 text-warning-foreground')}>
					{t('dashboard.weeklyLimit.GROUP_NEAR', { count: nearCount })}
				</span>
			)}
		</span>
	);
}

function lastInitialOf(words: string[]) {
	if (words.length < 2) {
		return '';
	}
	const lastWord = words[words.length - 1];
	return lastWord?.[0] ?? '';
}

function initialsOf(name: string) {
	const words = name.trim().split(/\s+/).filter(Boolean);
	const first = words[0]?.[0] ?? '';
	const last = lastInitialOf(words);
	return `${first}${last}`.toUpperCase();
}

export type MemberFaceSize = 'xs' | 'sm' | 'md';

const FACE_SIZES: Record<MemberFaceSize, string> = {
	xs: 'size-4',
	sm: 'size-5',
	md: 'size-6'
};

const FACE_INITIALS: Record<MemberFaceSize, string> = {
	xs: 'text-[7px]',
	sm: 'text-[9px]',
	md: 'text-[10px]'
};

export function MemberFace({
	name,
	imageUrl,
	size = 'xs'
}: Readonly<{ name: string; imageUrl: string | null; size?: MemberFaceSize }>) {
	return (
		<Avatar className={FACE_SIZES[size]}>
			<AvatarImage src={imageUrl ?? undefined} alt="" loading="lazy" />
			<AvatarFallback className={cn('font-medium', FACE_INITIALS[size])}>{initialsOf(name)}</AvatarFallback>
		</Avatar>
	);
}
