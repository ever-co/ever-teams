'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/core/components/common/input';
import { ChoiceCards, type ChoiceCardOption } from '@/core/components/settings/kit/choice-cards';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { rateApplyChoicesOf, type PastTimeRule, type RateApplyChoice } from '@/core/lib/utils/rate-apply';

const FIELD_LABEL = 'text-xs text-muted-foreground';

const CHOICE_TEXT_KEYS = {
	fromNow: { title: 'rates.APPLY_FROM_NOW', detail: 'rates.APPLY_FROM_NOW_DETAIL' },
	allTime: { title: 'rates.APPLY_ALL_TIME', detail: 'rates.APPLY_ALL_TIME_DETAIL' },
	fromDay: { title: 'rates.APPLY_FROM_DAY', detail: 'rates.APPLY_FROM_DAY_DETAIL' }
} as const;

type RateApplyQuestionProps = {
	rule: PastTimeRule;
	choice: RateApplyChoice;
	onChoiceChange: (choice: RateApplyChoice) => void;
	/** The day picked for "from a date", as a date field holds it (`YYYY-MM-DD`). */
	day: string;
	onDayChange: (day: string) => void;
	isDayMissing: boolean;
	disabled?: boolean;
};

function DayField({
	day,
	onDayChange,
	isDayMissing,
	disabled
}: Readonly<Pick<RateApplyQuestionProps, 'day' | 'onDayChange' | 'isDayMissing' | 'disabled'>>) {
	const t = useTranslations();
	const dayId = useId();
	const errorId = useId();
	let describedBy: string | undefined = undefined;
	if (isDayMissing) {
		describedBy = errorId;
	}

	return (
		<div className="flex flex-col gap-1">
			<label htmlFor={dayId} className={FIELD_LABEL}>
				{t('rates.APPLY_DAY')}
			</label>
			<Input
				id={dayId}
				type="date"
				value={day}
				max={localDayKeyOf(new Date())}
				disabled={disabled}
				aria-invalid={isDayMissing || undefined}
				aria-describedby={describedBy}
				onChange={(event) => onDayChange(event.target.value)}
				className="h-8 w-full tabular-nums sm:w-44"
			/>
			{isDayMissing && (
				<p id={errorId} role="alert" className="text-xs text-destructive-ink">
					{t('rates.APPLY_DAY_MISSING')}
				</p>
			)}
		</div>
	);
}

/**
 * "Apply to time already tracked?", asked under the fields of a rate being changed (#5212). The first answer is what a
 * save without a day does in this organization: keep the price of the time already tracked where its time keeps its
 * rate, else give all of it the new rate, as before. "From a date" re-prices the time tracked on or after a day.
 */
export function RateApplyQuestion({
	rule,
	choice,
	onChoiceChange,
	day,
	onDayChange,
	isDayMissing,
	disabled = false
}: Readonly<RateApplyQuestionProps>) {
	const t = useTranslations();
	const question = t('rates.APPLY_QUESTION');
	const options: ChoiceCardOption<RateApplyChoice>[] = rateApplyChoicesOf(rule).map((value) => ({
		value,
		title: t(CHOICE_TEXT_KEYS[value].title),
		detail: t(CHOICE_TEXT_KEYS[value].detail)
	}));
	const renderBelow = (value: RateApplyChoice) => {
		if (value !== 'fromDay') {
			return null;
		}
		return <DayField day={day} onDayChange={onDayChange} isDayMissing={isDayMissing} disabled={disabled} />;
	};

	return (
		<div className="flex min-w-0 flex-col gap-1.5">
			<p aria-hidden="true" className={FIELD_LABEL}>
				{question}
			</p>
			<ChoiceCards
				legend={question}
				options={options}
				value={choice}
				onChange={onChoiceChange}
				disabled={disabled}
				renderBelow={renderBelow}
			/>
			{rule === 'takesNewRate' && (
				<p className="text-xs text-pretty text-muted-foreground">{t('rates.APPLY_WORKSPACE_HINT')}</p>
			)}
		</div>
	);
}
