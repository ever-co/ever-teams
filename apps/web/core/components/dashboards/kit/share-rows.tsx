'use client';

import type { ReactNode } from 'react';
import { useLocale } from 'next-intl';
import { cn } from '@/core/lib/helpers';
import { formatPercent, type ShareRow } from '@/core/lib/utils/dashboard-figures';
import { ShareMeter } from './meters';

const LEADING_TONES = ['bg-primary', 'bg-primary/60', 'bg-primary/30'];
const OTHER_TONE = 'bg-foreground/15';

export function shareToneOf(index: number, isOther: boolean) {
	if (isOther) {
		return OTHER_TONE;
	}
	return LEADING_TONES[index] ?? OTHER_TONE;
}

/** One stacked bar for the split of a total: the leading items in brand tones, the rest in one grey segment. */
export function ShareBar<T>({ rows, className }: Readonly<{ rows: ReadonlyArray<ShareRow<T>>; className?: string }>) {
	return (
		<div aria-hidden="true" className={cn('flex h-1.5 w-full gap-px overflow-hidden rounded-full', className)}>
			{rows.map((row, index) => (
				<span key={row.key} className={shareToneOf(index, row.isOther)} style={{ width: `${row.share}%` }} />
			))}
		</div>
	);
}

const ROW_GRID =
	'grid min-h-10 grid-cols-[2.75rem_minmax(0,1fr)_5rem] items-center gap-x-3 px-4 py-1.5 sm:grid-cols-[2.75rem_minmax(0,1fr)_minmax(4rem,9rem)_5.5rem]';

/** For a side sheet, where the regular meter leaves the name a few letters. */
const NARROW_ROW_GRID =
	'grid min-h-10 grid-cols-[2.75rem_minmax(0,1fr)_minmax(2.5rem,4.5rem)_4.5rem] items-center gap-x-3 px-4 py-1.5';

type ShareRowsDensity = 'regular' | 'narrow';

function rowGridOf(density: ShareRowsDensity) {
	if (density === 'narrow') {
		return NARROW_ROW_GRID;
	}
	return ROW_GRID;
}

function meterClassOf(density: ShareRowsDensity) {
	if (density === 'narrow') {
		return undefined;
	}
	return 'max-sm:hidden';
}

/**
 * Ranked rows that say where a total went: the share first, the name, a thin meter, the value at the right. A capped
 * list closes with one "N other ..." row holding the rest, so the block keeps its height.
 */
export function ShareRows<T>({
	rows,
	renderName,
	formatValue,
	otherLabel,
	className,
	density = 'regular'
}: Readonly<{
	rows: ReadonlyArray<ShareRow<T>>;
	renderName: (item: T) => ReactNode;
	formatValue: (value: number) => string;
	otherLabel: (count: number) => string;
	className?: string;
	density?: ShareRowsDensity;
}>) {
	const locale = useLocale();
	const rowGrid = rowGridOf(density);
	const meterClass = meterClassOf(density);
	return (
		<ul className={cn('flex flex-col', className)}>
			{rows.map((row) => (
				<li key={row.key} className={rowGrid}>
					<span className="text-[13px] tabular-nums text-muted-foreground">
						{formatPercent(row.share, locale)}
					</span>
					<span className="flex min-w-0 items-center gap-2 text-[13px] text-foreground">
						{row.item && renderName(row.item)}
						{row.isOther && (
							<span className="truncate text-muted-foreground">{otherLabel(row.otherCount)}</span>
						)}
					</span>
					<ShareMeter share={row.share} className={meterClass} />
					<span className="text-right text-[13px] font-medium tabular-nums text-foreground">
						{formatValue(row.value)}
					</span>
				</li>
			))}
		</ul>
	);
}
