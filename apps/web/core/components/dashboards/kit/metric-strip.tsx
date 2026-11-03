'use client';

import { type KeyboardEvent, type ReactNode, type RefObject, useCallback } from 'react';
import { useActiveIndicator } from '@/core/hooks/common/use-active-indicator';
import { cn } from '@/core/lib/helpers';
import { SKELETON_BAR } from './recipes';

export type MetricTone = 'default' | 'success' | 'warning' | 'destructive';

export interface MetricItem<K extends string> {
	key: K;
	label: string;
	value: ReactNode;
	/** One muted line under the value: what the figure is made of or compared with. */
	hint?: ReactNode;
	tone?: MetricTone;
}

interface MetricStripProps<K extends string> {
	items: ReadonlyArray<MetricItem<K>>;
	ariaLabel: string;
	isLoading?: boolean;
	/** When set, the cells are tabs that pick what the chart under the strip shows. */
	selectedKey?: K;
	onSelect?: (key: K) => void;
	className?: string;
}

const CELL =
	'relative flex min-w-36 flex-1 snap-start flex-col justify-center gap-1 px-4 py-3 text-left outline-none sm:min-w-0';

const SELECTABLE_CELL =
	'cursor-pointer transition-colors duration-150 hover:bg-foreground/[0.025] focus-visible:bg-foreground/[0.04]';

const LABEL = 'truncate text-xs text-muted-foreground';

const VALUE = 'truncate text-lg font-semibold leading-tight tabular-nums text-foreground';

const HINT = 'truncate text-xs tabular-nums text-muted-foreground';

/** Line boxes of the value and the hint, so a loading cell, a loaded one and one without a hint share one height. */
const VALUE_LINE_BOX = 'flex h-[1.40625rem] items-center';

const HINT_LINE_BOX = 'flex h-4 items-center';

const VALUE_TONES: Record<MetricTone, string> = {
	default: '',
	success: 'text-success-foreground',
	warning: 'text-warning-foreground',
	destructive: 'text-destructive-ink'
};

const NEXT_KEYS = new Set(['ArrowRight', 'ArrowDown']);
const PREVIOUS_KEYS = new Set(['ArrowLeft', 'ArrowUp']);

function wrappedIndex(index: number, length: number) {
	return (index + length) % length;
}

function tabIndexFor(isSelectable: boolean, isSelected: boolean) {
	if (!isSelectable) {
		return undefined;
	}
	if (isSelected) {
		return 0;
	}
	return -1;
}

function listRoleFor(isSelectable: boolean) {
	if (isSelectable) {
		return 'tablist';
	}
	return 'list';
}

function refFor(isSelected: boolean, activeRef: RefObject<HTMLButtonElement | null>) {
	if (isSelected) {
		return activeRef;
	}
	return undefined;
}

function MetricCellBody<K extends string>({ item, isLoading }: Readonly<{ item: MetricItem<K>; isLoading: boolean }>) {
	const tone = item.tone ?? 'default';
	const hasHint = Boolean(item.hint);
	if (isLoading) {
		return (
			<>
				<span className={LABEL}>{item.label}</span>
				<span className={VALUE_LINE_BOX}>
					<span className={cn('h-4 w-20', SKELETON_BAR)} />
				</span>
				<span className={HINT_LINE_BOX}>
					<span className={cn('h-2.5 w-24', SKELETON_BAR)} />
				</span>
			</>
		);
	}
	return (
		<>
			<span className={LABEL}>{item.label}</span>
			<span className={cn(VALUE, VALUE_TONES[tone])}>{item.value}</span>
			{hasHint && <span className={HINT}>{item.hint}</span>}
			{!hasHint && <span aria-hidden="true" className={HINT_LINE_BOX} />}
		</>
	);
}

/**
 * The figures of a period in one band, cells set apart by their own spacing (no card per figure, no dividers). When `onSelect` is given the cells are
 * tabs: the picked figure carries the sliding underline and the single chart below shows it, so one chart replaces
 * one per figure. On a phone the band scrolls sideways instead of stacking.
 */
export function MetricStrip<K extends string>({
	items,
	ariaLabel,
	isLoading = false,
	selectedKey,
	onSelect,
	className
}: Readonly<MetricStripProps<K>>) {
	const isSelectable = Boolean(onSelect);
	const activeKey = selectedKey ?? '';
	const { listRef, activeRef, box } = useActiveIndicator<HTMLDivElement, HTMLButtonElement>(activeKey);

	const selectByOffset = useCallback(
		(offset: number) => {
			const currentIndex = items.findIndex((item) => item.key === selectedKey);
			const nextIndex = wrappedIndex(currentIndex + offset, items.length);
			const nextItem = items[nextIndex];
			if (!nextItem) {
				return;
			}
			onSelect?.(nextItem.key);
			const cells = listRef.current?.querySelectorAll<HTMLButtonElement>('[data-metric-cell]');
			cells?.[nextIndex]?.focus();
		},
		[items, listRef, onSelect, selectedKey]
	);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent<HTMLDivElement>) => {
			if (!isSelectable) {
				return;
			}
			const goesNext = NEXT_KEYS.has(event.key);
			const goesPrevious = PREVIOUS_KEYS.has(event.key);
			if (goesNext) {
				event.preventDefault();
				selectByOffset(1);
				return;
			}
			if (goesPrevious) {
				event.preventDefault();
				selectByOffset(-1);
			}
		},
		[isSelectable, selectByOffset]
	);

	const showsIndicator = isSelectable && Boolean(box);
	const listRole = listRoleFor(isSelectable);

	return (
		<div
			ref={listRef}
			role={listRole}
			aria-label={ariaLabel}
			onKeyDown={handleKeyDown}
			className={cn('relative flex snap-x overflow-x-auto [scrollbar-width:none]', className)}
		>
			{items.map((item) => {
				const isSelected = isSelectable && item.key === selectedKey;
				const showsIndicatorInPlace = isSelected && !box;
				if (!isSelectable) {
					return (
						<div key={item.key} role="listitem" className={CELL}>
							<MetricCellBody item={item} isLoading={isLoading} />
						</div>
					);
				}
				return (
					<button
						key={item.key}
						ref={refFor(isSelected, activeRef)}
						type="button"
						role="tab"
						data-metric-cell=""
						aria-selected={isSelected}
						tabIndex={tabIndexFor(isSelectable, isSelected)}
						onClick={() => onSelect?.(item.key)}
						className={cn(CELL, SELECTABLE_CELL)}
					>
						<MetricCellBody item={item} isLoading={isLoading} />
						{showsIndicatorInPlace && (
							<span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />
						)}
					</button>
				);
			})}
			{showsIndicator && box && (
				<span
					aria-hidden="true"
					style={{ transform: `translateX(${box.left}px)`, width: box.width }}
					className="pointer-events-none absolute bottom-0 left-0 h-0.5 bg-primary transition-[transform,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
				/>
			)}
		</div>
	);
}
