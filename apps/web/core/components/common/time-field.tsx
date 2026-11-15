'use client';

import { useLayoutEffect, useMemo, useRef, type KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Clock } from '@/core/components/icons';
import { useWorkspaceLocale } from '@/core/hooks/common/use-workspace-locale';
import { minutesOfTimeValue, timeValueOf, timeWritingOf } from '@/core/lib/utils/typed-date-time';
import { PICKER_FOCUS_ATTRIBUTE, PickerField, type PickerFieldProps } from './picker-field';

const MINUTES_PER_DAY = 24 * 60;

/** Minutes between two times of the list, unless a field asks for another step. */
const DEFAULT_STEP = 15;

const TIME_OPTION =
	'flex h-8 w-full shrink-0 items-center rounded-md px-2 text-left text-[13px] tabular-nums text-foreground outline-none transition-colors hover:bg-foreground/5 focus-visible:bg-foreground/5 aria-selected:bg-primary/[0.08] aria-selected:font-medium aria-selected:text-primary-ink disabled:pointer-events-none disabled:opacity-40';

/** A time of day as `HH:mm`, `''` for none: the value, the earliest time (`min`) and the latest one (`max`). */
export interface TimeFieldProps extends PickerFieldProps {
	/** Minutes between two times of the list (15 by default); any minute can still be typed. */
	step?: number;
}

interface TimeListProps {
	value: string;
	min?: string;
	max?: string;
	step: number;
	label: string;
	textOf: (value: string) => string;
	onPick: (value: string) => void;
}

function isOutside(minutes: number, earliest: number | null, latest: number | null) {
	if (earliest !== null && minutes < earliest) {
		return true;
	}
	return latest !== null && minutes > latest;
}

const KEY_MOVES: Record<string, (index: number, last: number) => number> = {
	ArrowDown: (index, last) => Math.min(index + 1, last),
	ArrowUp: (index) => Math.max(index - 1, 0),
	Home: () => 0,
	End: (_, last) => last
};

/** The times of a day, the one picked marked, those out of range unavailable, opened at the time of the field. */
function TimeList({ value, min, max, step, label, textOf, onPick }: Readonly<TimeListProps>) {
	const listRef = useRef<HTMLDivElement>(null);
	const times = useMemo(
		() => Array.from({ length: Math.ceil(MINUTES_PER_DAY / step) }, (_, index) => timeValueOf(index * step)),
		[step]
	);
	const earliest = minutesOfTimeValue(min ?? '');
	const latest = minutesOfTimeValue(max ?? '');
	const available = times.filter((time) => !isOutside(minutesOfTimeValue(time) ?? 0, earliest, latest));
	// The time of the field, else the first one after it in the list, else the first available
	const current = minutesOfTimeValue(value) ?? earliest ?? 0;
	const target = available.find((time) => (minutesOfTimeValue(time) ?? 0) >= current) ?? available[0];

	useLayoutEffect(() => {
		const list = listRef.current;
		const option = list?.querySelector<HTMLElement>(`[${PICKER_FOCUS_ATTRIBUTE}]`);
		if (list && option) {
			list.scrollTop = option.offsetTop - (list.clientHeight - option.offsetHeight) / 2;
		}
	}, []);

	const moveFocus = (event: KeyboardEvent<HTMLDivElement>) => {
		const move = KEY_MOVES[event.key];
		const options = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('button:enabled') ?? []);
		if (!move || options.length === 0) {
			return;
		}
		event.preventDefault();
		const index = options.indexOf(document.activeElement as HTMLButtonElement);
		options[move(index, options.length - 1)]?.focus();
	};

	return (
		<div
			ref={listRef}
			role="listbox"
			aria-label={label}
			tabIndex={-1}
			onKeyDown={moveFocus}
			className="relative flex max-h-60 w-32 flex-col overflow-y-auto overscroll-contain"
		>
			{times.map((time) => {
				const isTarget = time === target;
				return (
					<button
						key={time}
						type="button"
						role="option"
						aria-selected={time === value}
						disabled={isOutside(minutesOfTimeValue(time) ?? 0, earliest, latest)}
						tabIndex={isTarget ? 0 : -1}
						{...(isTarget ? { [PICKER_FOCUS_ATTRIBUTE]: '' } : {})}
						onClick={() => onPick(time)}
						className={TIME_OPTION}
					>
						{textOf(time)}
					</button>
				);
			})}
		</div>
	);
}

/**
 * A time of day typed on the workspace's clock, or picked in the app's list of times (#5318). It takes and gives the
 * value of the native time field it replaced, so a form keeps its own logic.
 */
export function TimeField({ value, min, max, step = DEFAULT_STEP, ...props }: Readonly<TimeFieldProps>) {
	const t = useTranslations();
	const locale = useWorkspaceLocale();
	const writing = useMemo(() => timeWritingOf(locale), [locale]);
	const label = t('common.PICK_A_TIME');

	return (
		<PickerField
			{...props}
			value={value}
			min={min}
			max={max}
			writing={writing}
			pickerLabel={label}
			pickerIcon={<Clock aria-hidden="true" />}
			renderPicker={(pick) => (
				<TimeList
					value={value}
					min={min}
					max={max}
					step={step}
					label={label}
					textOf={writing.textOf}
					onPick={pick}
				/>
			)}
		/>
	);
}
