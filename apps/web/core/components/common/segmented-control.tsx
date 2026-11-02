'use client';

import { Fragment, type KeyboardEvent, type ReactElement, type ReactNode, type RefObject, useCallback } from 'react';
import { useActiveIndicator } from '@/core/hooks/common/use-active-indicator';
import { cn } from '@/core/lib/helpers';

export interface SegmentedControlItem<T extends string> {
	value: T;
	label?: ReactNode;
	icon?: ReactNode;
	count?: number;
	/** The accessible name of an item that shows an icon only. */
	ariaLabel?: string;
}

interface SegmentedControlProps<T extends string> {
	items: ReadonlyArray<SegmentedControlItem<T>>;
	value: T;
	onValueChange: (value: T) => void;
	ariaLabel: string;
	/** Wraps an item's button, for a tooltip or a link; the button keeps the measured box. */
	renderItem?: (item: SegmentedControlItem<T>, button: ReactElement) => ReactNode;
	className?: string;
}

/** The raised thumb: a white pill on a hairline, the same in every switch of the app. */
const THUMB_CLASS =
	'rounded-md bg-card shadow-[0_1px_2px_rgb(0_0_0/0.08)] hairline-ring ring-foreground/10 dark:bg-foreground/[0.09] dark:ring-foreground/15';

const ITEM_CLASS =
	'relative inline-flex h-7 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[13px] font-medium text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 [&_svg]:size-4 [&_svg]:shrink-0';

const ICON_ONLY_ITEM_CLASS = 'w-7 px-0';

const COUNT_CLASS =
	'inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-[5px] bg-foreground/[0.06] px-1 text-[11px] font-medium tabular-nums text-muted-foreground transition-colors duration-150';

const COUNT_ACTIVE_CLASS = 'bg-primary/10 text-primary-ink';

const NEXT_KEYS = ['ArrowRight', 'ArrowDown'];
const PREVIOUS_KEYS = ['ArrowLeft', 'ArrowUp'];

function isIconOnly<T extends string>(item: SegmentedControlItem<T>) {
	const hasIcon = Boolean(item.icon);
	const hasLabel = Boolean(item.label);
	return hasIcon && !hasLabel;
}

function hasCount<T extends string>(item: SegmentedControlItem<T>) {
	return typeof item.count === 'number';
}

function tabIndexFor(isActive: boolean) {
	if (isActive) {
		return 0;
	}
	return -1;
}

function activeRefFor(isActive: boolean, activeRef: RefObject<HTMLButtonElement | null>) {
	if (isActive) {
		return activeRef;
	}
	return undefined;
}

function wrappedIndex(index: number, length: number) {
	return (index + length) % length;
}

/**
 * One switch for the whole app (views, periods, panels), after the "Day Week Month Year" control of the references:
 * a grey track and one white thumb that slides from the previous option to the picked one, so the motion follows
 * the direction of the change. Every option keeps the same size and weight; only the colour changes.
 */
export function SegmentedControl<T extends string>({
	items,
	value,
	onValueChange,
	ariaLabel,
	renderItem,
	className
}: SegmentedControlProps<T>) {
	const { listRef, activeRef, box } = useActiveIndicator<HTMLDivElement, HTMLButtonElement>(value);

	const selectByOffset = useCallback(
		(offset: number) => {
			const currentIndex = items.findIndex((item) => item.value === value);
			const nextIndex = wrappedIndex(currentIndex + offset, items.length);
			const nextItem = items[nextIndex];
			if (!nextItem) {
				return;
			}
			onValueChange(nextItem.value);
			const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('[data-segment]');
			buttons?.[nextIndex]?.focus();
		},
		[items, value, onValueChange, listRef]
	);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent<HTMLDivElement>) => {
			const goesNext = NEXT_KEYS.includes(event.key);
			const goesPrevious = PREVIOUS_KEYS.includes(event.key);
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
		[selectByOffset]
	);

	return (
		<div
			ref={listRef}
			role="tablist"
			aria-label={ariaLabel}
			onKeyDown={handleKeyDown}
			className={cn('relative inline-flex items-center gap-0.5 rounded-lg bg-foreground/[0.05] p-0.5', className)}
		>
			{box && (
				<span
					aria-hidden="true"
					style={{ transform: `translateX(${box.left}px)`, width: box.width }}
					className={cn(
						THUMB_CLASS,
						'pointer-events-none absolute inset-y-0.5 left-0 transition-[transform,width] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none'
					)}
				/>
			)}
			{items.map((item) => {
				const isActive = item.value === value;
				const showsThumbInPlace = isActive && !box;
				const button = (
					<button
						key={item.value}
						ref={activeRefFor(isActive, activeRef)}
						type="button"
						role="tab"
						data-segment=""
						aria-selected={isActive}
						aria-label={item.ariaLabel}
						tabIndex={tabIndexFor(isActive)}
						onClick={() => onValueChange(item.value)}
						className={cn(
							ITEM_CLASS,
							isIconOnly(item) && ICON_ONLY_ITEM_CLASS,
							isActive && 'text-foreground',
							showsThumbInPlace && THUMB_CLASS
						)}
					>
						{item.icon}
						{item.label}
						{hasCount(item) && (
							<span className={cn(COUNT_CLASS, isActive && COUNT_ACTIVE_CLASS)}>{item.count}</span>
						)}
					</button>
				);
				if (renderItem) {
					return <Fragment key={item.value}>{renderItem(item, button)}</Fragment>;
				}
				return button;
			})}
		</div>
	);
}
