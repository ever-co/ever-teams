'use client';

import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { toast } from 'sonner';
import { controlGroupRecipe } from '@/core/components/common/input';
import { CircleAlert, Minus, Plus } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { formatIntegerToHour } from '@/core/lib/helpers/index';
import { oneHourLess, oneHourMore, plannedHoursFromInput, plannedHoursText } from '@/core/lib/utils/daily-plan-editor';

const SEGMENT_COUNT = 24;

/** Past this many hours above the plan, the bar turns to the warning hue: the plan no longer holds the work. */
const OVER_PLAN_TOLERANCE_HOURS = 1;

const STEP_BUTTON =
	'flex size-8 shrink-0 items-center justify-center text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:bg-foreground/5 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5';

const HOURS_INPUT =
	'w-10 bg-transparent p-0 text-center text-[13px] font-medium tabular-nums text-foreground outline-none';

const READ_ONLY_VALUE = 'text-[13px] font-medium tabular-nums text-foreground';

export function PlanRow({ icon, label, children }: Readonly<{ icon: ReactNode; label: string; children: ReactNode }>) {
	return (
		<div className="flex min-h-10 items-center justify-between gap-3">
			<span className="flex items-center gap-2 text-[13px] text-muted-foreground [&_svg]:size-4">
				{icon}
				{label}
			</span>
			<div className="flex min-w-0 items-center gap-2">{children}</div>
		</div>
	);
}

interface PlanHoursStepperProps {
	hours: number;
	canEdit: boolean;
	onChange: (hours: number) => void;
}

/**
 * The plan's hours, typed as the Set hours box of the same plan takes them (2,5, 2.5 or 2:30) or moved an hour at a
 * time. While a person types, the field keeps their text and the plan takes every entry it can read; an entry it
 * cannot read is refused when they leave the field, and the plan keeps the hours it had (#5713).
 */
export function PlanHoursStepper({ hours, canEdit, onChange }: Readonly<PlanHoursStepperProps>) {
	const t = useTranslations();
	const [typedText, setTypedText] = useState<string | null>(null);
	// The hours the plan had as the person began to type: an entry that ends unreadable gives them back
	const hoursBeforeTyping = useRef(hours);
	const isAtZero = hours <= 0;
	const isLessDisabled = !canEdit || isAtZero;
	// A plan cannot hold more than a day
	const isMoreDisabled = !canEdit || oneHourMore(hours) === hours;
	const shownText = typedText ?? plannedHoursText(hours);
	const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
		const text = event.target.value;
		const isFirstKeystroke = typedText === null;
		if (isFirstKeystroke) {
			hoursBeforeTyping.current = hours;
		}
		setTypedText(text);
		const typedHours = plannedHoursFromInput(text);
		if (typedHours !== null) {
			onChange(typedHours);
		}
	};
	const handleBlur = () => {
		const isUnreadable = typedText !== null && plannedHoursFromInput(typedText) === null;
		if (isUnreadable) {
			// What could be read on the way ("3" of "3h") was applied as it was typed: it is taken back
			onChange(hoursBeforeTyping.current);
			toast.warning(t('toasts.plans.HOURS_INVALID'), { id: 'plan-hours-invalid' });
		}
		setTypedText(null);
	};
	const stepTo = (nextHours: number) => {
		setTypedText(null);
		onChange(nextHours);
	};
	return (
		<div className={cn(controlGroupRecipe, 'h-8 w-auto overflow-hidden')}>
			<button
				type="button"
				onClick={() => stepTo(oneHourLess(hours))}
				disabled={isLessDisabled}
				aria-label={t('dailyPlan.editor.LESS_HOUR')}
				className={STEP_BUTTON}
			>
				<Minus aria-hidden="true" />
			</button>
			<label className="flex h-full items-center gap-0.5 hairline-l hairline-r border-border px-2">
				<input
					type="text"
					inputMode="decimal"
					value={shownText}
					onChange={handleInput}
					onBlur={handleBlur}
					onFocus={(event) => event.target.select()}
					readOnly={!canEdit}
					aria-label={t('dailyPlan.PLANNED_TIME')}
					className={HOURS_INPUT}
				/>
				<span aria-hidden="true" className="text-xs text-muted-foreground">
					{t('dailyPlan.editor.HOURS_SUFFIX')}
				</span>
			</label>
			<button
				type="button"
				onClick={() => stepTo(oneHourMore(hours))}
				disabled={isMoreDisabled}
				aria-label={t('dailyPlan.editor.MORE_HOUR')}
				className={STEP_BUTTON}
			>
				<Plus aria-hidden="true" />
			</button>
		</div>
	);
}

export function PlanHoursValue({ hours }: Readonly<{ hours: number }>) {
	return <span className={READ_ONLY_VALUE}>{formatIntegerToHour(hours)}</span>;
}

function filledSegmentsOf(value: number, plannedHours: number) {
	const hasPlannedTime = plannedHours > 0;
	if (!hasPlannedTime) {
		return 0;
	}
	const ratio = value / plannedHours;
	const segments = Math.round(ratio * SEGMENT_COUNT);
	return Math.min(SEGMENT_COUNT, segments);
}

interface PlanTimeBarProps {
	value: number;
	plannedHours: number;
	valueLabelKey: DottedLanguageObjectStringPaths;
}

/**
 * The plan's time as a row of blocks, one per twenty-fourth of the planned hours: the estimate (or the tracked time
 * of a past day) fills it from the left. Over the plan, the blocks take the warning hue.
 */
export function PlanTimeBar({ value, plannedHours, valueLabelKey }: Readonly<PlanTimeBarProps>) {
	const t = useTranslations();
	const filledSegments = filledSegmentsOf(value, plannedHours);
	const isOverPlan = value > plannedHours + OVER_PLAN_TOLERANCE_HOURS;
	const hasPlannedTime = plannedHours > 0;
	const valueLabel = t(valueLabelKey, { time: formatIntegerToHour(value) });
	let plannedLabel = t('dailyPlan.editor.NOTHING_PLANNED');
	if (hasPlannedTime) {
		plannedLabel = t('dailyPlan.editor.PLANNED_LABEL', { time: formatIntegerToHour(plannedHours) });
	}
	return (
		<div className="flex flex-col gap-1.5">
			<div aria-hidden="true" className="flex h-2 gap-[3px]">
				{Array.from({ length: SEGMENT_COUNT }, (_, index) => {
					const isFilled = index < filledSegments;
					const isOverFilled = isFilled && isOverPlan;
					return (
						<span
							key={index}
							className={cn(
								'flex-1 rounded-[2px] bg-foreground/[0.07]',
								isFilled && 'bg-primary',
								isOverFilled && 'bg-warning'
							)}
						/>
					);
				})}
			</div>
			<div className="flex items-center justify-between gap-3 text-xs tabular-nums text-muted-foreground">
				<span>{valueLabel}</span>
				<span>{plannedLabel}</span>
			</div>
		</div>
	);
}

export function PlanWarning({ messageKey }: Readonly<{ messageKey: DottedLanguageObjectStringPaths }>) {
	const t = useTranslations();
	return (
		<output className="flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2 text-xs leading-relaxed text-warning-foreground">
			<CircleAlert aria-hidden="true" className="mt-px size-3.5 shrink-0" />
			{t(messageKey)}
		</output>
	);
}
