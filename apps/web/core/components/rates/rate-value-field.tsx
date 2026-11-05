'use client';

import { FormEvent, useId, useState } from 'react';
import { useLocale, useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { Button } from '@/core/components/common/button';
import { controlGroupRecipe } from '@/core/components/common/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { EMPTY_FIELD_RECIPE, VALUE_FIELD_RECIPE } from '@/core/components/common/surface-recipes';
import { Pencil, Plus, Spinner } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import {
	parseRateInput,
	rateAmountTextOf,
	rateInputTextOf,
	rateValueOf,
	type RateInputProblem
} from '@/core/lib/utils/rates';

const PENCIL = 'text-muted-foreground/70 transition-colors group-hover/field:text-foreground';

const FIELD_INPUT =
	'h-full w-full min-w-0 bg-transparent text-[13px] font-medium tabular-nums text-foreground outline-none placeholder:text-muted-foreground/60';

const PROBLEM_KEYS: Record<RateInputProblem, DottedLanguageObjectStringPaths> = {
	invalid: 'rates.NUMBER_INVALID',
	negative: 'rates.NUMBER_NEGATIVE'
};

type RateValueFieldProps = {
	/** What the rate is, for the popover title and the field's accessible name ("Project rate", "Ana's rate"). */
	label: string;
	value: unknown;
	currency: string | null | undefined;
	hint?: string;
	readOnly?: boolean;
	onSave: (value: number | null) => Promise<unknown>;
};

export function RateValueField({
	label,
	value,
	currency,
	hint,
	readOnly = false,
	onSave
}: Readonly<RateValueFieldProps>) {
	const t = useTranslations();
	const locale = useLocale();
	const inputId = useId();
	const errorId = useId();
	const [isOpen, setIsOpen] = useState(false);
	const [draft, setDraft] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);

	const amount = rateAmountTextOf(value, currency, locale);
	const hasRate = amount !== null;
	const hasSavedRate = rateValueOf(value) !== null;

	if (readOnly) {
		if (!hasRate) {
			return null;
		}
		return (
			<span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">
				{t('rates.PER_HOUR', { amount })}
			</span>
		);
	}

	const open = (isNextOpen: boolean) => {
		// A failed save reports here only: the field stays open until the save has answered
		if (!isNextOpen && isSaving) {
			return;
		}
		if (isNextOpen) {
			setDraft(rateInputTextOf(value));
			setError(null);
		}
		setIsOpen(isNextOpen);
	};

	const save = async (nextValue: number | null) => {
		setIsSaving(true);
		try {
			await onSave(nextValue);
			setIsOpen(false);
		} catch (saveError) {
			const reasonKey = errorReasonKeyOf(saveError) as DottedLanguageObjectStringPaths;
			setError(t(reasonKey));
		} finally {
			setIsSaving(false);
		}
	};

	const submit = async (event: FormEvent) => {
		event.preventDefault();
		if (isSaving) {
			return;
		}
		const parsed = parseRateInput(draft);
		if (parsed.problem) {
			setError(t(PROBLEM_KEYS[parsed.problem]));
			return;
		}
		await save(parsed.value);
	};

	let triggerClassName = VALUE_FIELD_RECIPE;
	let triggerLabel = `${label}: ${amount}`;
	if (!hasRate) {
		triggerClassName = EMPTY_FIELD_RECIPE;
		triggerLabel = label;
	}

	let describedBy: string | undefined = undefined;
	if (error) {
		describedBy = errorId;
	}

	return (
		<Popover open={isOpen} onOpenChange={open}>
			<PopoverTrigger aria-label={triggerLabel} className={triggerClassName}>
				{!hasRate && <Plus aria-hidden="true" />}
				{!hasRate && t('rates.ADD_RATE')}
				{hasRate && t('rates.PER_HOUR', { amount })}
				{isSaving && <Spinner aria-hidden="true" className="size-3.5 animate-spin text-muted-foreground" />}
				{hasRate && !isSaving && <Pencil aria-hidden="true" className={PENCIL} />}
			</PopoverTrigger>
			<PopoverContent align="end" className="w-64 p-3">
				<form onSubmit={submit}>
					<label htmlFor={inputId} className="text-[13px] font-semibold text-foreground">
						{label}
					</label>
					{hint && <p className="mt-0.5 text-xs text-pretty text-muted-foreground">{hint}</p>}
					<div className={cn(controlGroupRecipe, 'mt-2.5 h-8 gap-1.5 px-2.5')}>
						<input
							id={inputId}
							inputMode="decimal"
							autoComplete="off"
							autoFocus
							placeholder={t('rates.NOT_SET')}
							value={draft}
							aria-invalid={Boolean(error) || undefined}
							aria-describedby={describedBy}
							onChange={(event) => {
								setDraft(event.target.value);
								setError(null);
							}}
							className={FIELD_INPUT}
						/>
						{currency && <span className="text-xs text-muted-foreground">{currency}</span>}
					</div>
					{error && (
						<p id={errorId} role="alert" className="mt-1.5 text-xs text-destructive-ink">
							{error}
						</p>
					)}
					<div className="-mx-3 mt-3 flex items-center gap-2 hairline-t border-border px-3 pt-3">
						{hasSavedRate && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								disabled={isSaving}
								onClick={() => void save(null)}
							>
								{t('common.CLEAR')}
							</Button>
						)}
						<Button
							type="button"
							variant="ghost"
							size="sm"
							disabled={isSaving}
							onClick={() => setIsOpen(false)}
							className="ml-auto"
						>
							{t('common.CANCEL')}
						</Button>
						<Button type="submit" size="sm" disabled={isSaving}>
							{t('common.SAVE')}
						</Button>
					</div>
				</form>
			</PopoverContent>
		</Popover>
	);
}
