'use client';

import { FormEvent, useId, useState } from 'react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { controlRecipe, Input } from '@/core/components/common/input';
import { Button } from '@/core/components/duplicated-components/_button';
import { Spinner } from '@/core/components/icons';
import { CurrencySelect } from '@/core/components/rates/currency-select';
import { useRateChangeRequest } from '@/core/hooks/organizations/rates/use-rates';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import {
	parseRateInput,
	RATE_REASON_MAX_LENGTH,
	rateRequestFailureOutcomeOf,
	rateRequestSentOutcomeOf,
	type RateInputProblem,
	type RateRequestOutcome
} from '@/core/lib/utils/rates';
import { cn } from '@/core/lib/helpers';

const DEFAULT_CURRENCY = 'USD';

const PROBLEM_KEYS: Record<RateInputProblem, DottedLanguageObjectStringPaths> = {
	invalid: 'rates.NUMBER_INVALID',
	negative: 'rates.NUMBER_NEGATIVE'
};

const OUTCOME_KEYS: Record<RateRequestOutcome, DottedLanguageObjectStringPaths> = {
	sent: 'rates.REQUEST_SENT',
	nobody: 'rates.REQUEST_NOBODY',
	unavailable: 'rates.REQUEST_UNAVAILABLE',
	failed: 'rates.REQUEST_FAILED'
};

const FIELD_LABEL = 'text-xs text-muted-foreground';

type RateChangeRequestFormProps = {
	currentCurrency: string | null;
	onClose: () => void;
};

/**
 * The employee's request for another rate. Gauzy notifies the organization's admins, who apply it; nothing changes
 * until they do. The request is sent once: the form then says who was told, or why nobody was.
 */
export function RateChangeRequestForm({ currentCurrency, onClose }: Readonly<RateChangeRequestFormProps>) {
	const t = useTranslations();
	const rateId = useId();
	const currencyId = useId();
	const reasonId = useId();
	const errorId = useId();
	const { requestRateChange, isSending } = useRateChangeRequest();
	const [rateText, setRateText] = useState('');
	const [currency, setCurrency] = useState(currentCurrency ?? DEFAULT_CURRENCY);
	const [reason, setReason] = useState('');
	const [problem, setProblem] = useState<string | null>(null);
	const [outcome, setOutcome] = useState<RateRequestOutcome | null>(null);
	const [failureReason, setFailureReason] = useState<string | null>(null);

	const submit = async (event: FormEvent) => {
		event.preventDefault();
		if (isSending) {
			return;
		}
		const parsed = parseRateInput(rateText);
		if (parsed.problem) {
			setProblem(t(PROBLEM_KEYS[parsed.problem]));
			return;
		}
		if (parsed.value === null) {
			setProblem(t('rates.REQUESTED_RATE_REQUIRED'));
			return;
		}
		const trimmedReason = reason.trim();
		try {
			const result = await requestRateChange({
				billRateValue: parsed.value,
				billRateCurrency: currency,
				reason: trimmedReason || undefined
			});
			setOutcome(rateRequestSentOutcomeOf(result.notified));
		} catch (error) {
			const failure = rateRequestFailureOutcomeOf(error);
			setOutcome(failure);
			const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
			setFailureReason(t(reasonKey));
		}
	};

	const isAccepted = outcome === 'sent' || outcome === 'nobody';
	if (isAccepted) {
		return (
			<div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
				<p role="status" className="min-w-0 flex-1 text-[13px] text-pretty text-foreground">
					{t(OUTCOME_KEYS[outcome])}
				</p>
				<Button type="button" variant="outline" size="sm" onClick={onClose}>
					{t('common.CLOSE')}
				</Button>
			</div>
		);
	}

	const isRefused = outcome === 'unavailable' || outcome === 'failed';
	let message: string | null = problem;
	if (isRefused) {
		message = t(OUTCOME_KEYS[outcome]);
	}
	const showsFailureReason = outcome === 'failed' && Boolean(failureReason);

	let describedBy: string | undefined = undefined;
	if (message) {
		describedBy = errorId;
	}

	return (
		<form
			onSubmit={submit}
			aria-label={t('rates.REQUEST_CHANGE')}
			className="flex flex-col gap-3 px-4 py-3"
			noValidate
		>
			<div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1.4fr]">
				<div className="flex min-w-0 flex-col gap-1">
					<label htmlFor={rateId} className={FIELD_LABEL}>
						{t('rates.REQUESTED_RATE')}
					</label>
					<Input
						id={rateId}
						value={rateText}
						inputMode="decimal"
						autoFocus
						autoComplete="off"
						aria-invalid={Boolean(problem) || undefined}
						aria-describedby={describedBy}
						onChange={(event) => {
							setRateText(event.target.value);
							setProblem(null);
						}}
						className="h-8 tabular-nums"
					/>
				</div>
				<div className="flex min-w-0 flex-col gap-1">
					<label htmlFor={currencyId} className={FIELD_LABEL}>
						{t('rates.CURRENCY')}
					</label>
					<CurrencySelect id={currencyId} value={currency} onChange={setCurrency} disabled={isSending} />
				</div>
			</div>
			<div className="flex min-w-0 flex-col gap-1">
				<label htmlFor={reasonId} className={FIELD_LABEL}>
					{t('rates.REQUEST_REASON')}
				</label>
				<textarea
					id={reasonId}
					value={reason}
					maxLength={RATE_REASON_MAX_LENGTH}
					onChange={(event) => setReason(event.target.value)}
					className={cn(
						controlRecipe,
						'field-sizing-content max-h-[6lh] min-h-16 resize-none p-3 text-[13px]'
					)}
				/>
			</div>
			{message && (
				<p id={errorId} role="alert" className="text-xs text-destructive-ink">
					{message}
					{showsFailureReason && ` ${failureReason}`}
				</p>
			)}
			<div className="flex justify-end gap-2">
				<Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSending}>
					{t('common.CANCEL')}
				</Button>
				<Button type="submit" size="sm" disabled={isSending}>
					{isSending && <Spinner className="size-3.5 animate-spin" />}
					{t('rates.REQUEST_SEND')}
				</Button>
			</div>
		</form>
	);
}
