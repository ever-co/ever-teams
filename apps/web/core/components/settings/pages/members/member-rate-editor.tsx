'use client';

import { FormEvent, KeyboardEvent, useId, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useLocale, useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { Input } from '@/core/components/common/input';
import { Button } from '@/core/components/duplicated-components/_button';
import { Spinner } from '@/core/components/icons';
import { CurrencySelect } from '@/core/components/rates/currency-select';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { SETTINGS_SKELETON_BAR } from '@/core/components/settings/kit/settings-page';
import { useEmployeePayRate } from '@/core/hooks/organizations/rates/use-rates';
import { cn } from '@/core/lib/helpers';
import {
	changedEmployeeRatesOf,
	changedPayRateOf,
	parseRateInput,
	rateAmountTextOf,
	rateInputTextOf,
	rateValueOf,
	shownCurrencyOf,
	type RateInputProblem
} from '@/core/lib/utils/rates';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import type { MemberRate, MemberRowModel } from '@/core/hooks/settings/use-team-members-settings';
import type { IEmployeeRatesInput } from '@/core/types/schemas/organization/rates.schema';
import { MemberAvatar } from './people-parts';

const PROBLEM_KEYS: Record<RateInputProblem, DottedLanguageObjectStringPaths> = {
	invalid: 'rates.NUMBER_INVALID',
	negative: 'rates.NUMBER_NEGATIVE'
};

const FIELD_LABEL = 'text-xs text-muted-foreground';

export function MemberRateText({ rate }: Readonly<{ rate: MemberRate }>) {
	const t = useTranslations();
	const locale = useLocale();
	const amount = rateAmountTextOf(rate.value, rate.currency, locale);
	if (amount === null) {
		return null;
	}
	return (
		<span className="hidden shrink-0 text-xs text-muted-foreground tabular-nums md:block">
			{t('rates.PER_HOUR', { amount })}
		</span>
	);
}

function describedByOf(error: string | null, errorId: string) {
	if (!error) {
		return undefined;
	}
	return errorId;
}

export function MemberRateEditor({
	row,
	onCancel,
	onSaveRates
}: Readonly<{
	row: MemberRowModel;
	onCancel: () => void;
	onSaveRates: (rowId: string, rates: IEmployeeRatesInput) => Promise<void>;
}>) {
	const t = useTranslations();
	const rateId = useId();
	const currencyId = useId();
	const limitId = useId();
	const payRateId = useId();
	const payCurrencyId = useId();
	const errorId = useId();
	const [rateText, setRateText] = useState(() => rateInputTextOf(row.rate.value));
	const organization = useAtomValue(currentOrganizationState);
	const [initialCurrency] = useState(() => shownCurrencyOf(row.rate.currency, organization?.currency));
	const [initialRates] = useState(() => ({ value: row.rate.value, weeklyLimit: row.rate.weeklyLimit }));
	const [currency, setCurrency] = useState(initialCurrency);
	const [limitText, setLimitText] = useState(() => rateInputTextOf(row.rate.weeklyLimit));
	const [error, setError] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const hasError = Boolean(error);

	const payRate = useEmployeePayRate(row.employeeId ?? undefined, row.canEditRate);
	const payRateData = payRate.data;
	const loadsPayRate = row.canEditRate && payRate.isLoading;
	const editsPayRate = row.canEditRate && Boolean(payRateData);
	const payRateReadFailed = row.canEditRate && payRate.isError && !payRate.isUnavailable && !payRateData;
	const storedPayRate = rateValueOf(payRateData?.payRateValue);
	const initialPayCurrency = shownCurrencyOf(payRateData?.payRateCurrency ?? null, payRateData?.currency);
	const [payTextChoice, setPayTextChoice] = useState<string | null>(null);
	const [payCurrencyChoice, setPayCurrencyChoice] = useState<string | null>(null);
	const payText = payTextChoice ?? rateInputTextOf(storedPayRate);
	const payCurrency = payCurrencyChoice ?? initialPayCurrency;

	const save = async (event: FormEvent) => {
		event.preventDefault();
		if (isSaving) {
			return;
		}
		const rate = parseRateInput(rateText);
		const limit = parseRateInput(limitText);
		const pay = parseRateInput(payText);
		const problem = rate.problem ?? limit.problem ?? pay.problem;
		if (problem) {
			setError(t(PROBLEM_KEYS[problem]));
			return;
		}
		// Gauzy keeps the limit in whole hours and would cut 37.5 to 37 without a word
		const isPartHour = limit.value !== null && !Number.isInteger(limit.value);
		if (isPartHour) {
			setError(t('rates.WEEKLY_LIMIT_WHOLE_HOURS'));
			return;
		}
		const billingChanges = changedEmployeeRatesOf(
			{ value: initialRates.value, currency: initialCurrency, weeklyLimit: initialRates.weeklyLimit },
			{ value: rate.value, currency, weeklyLimit: limit.value }
		);
		let payChanges: IEmployeeRatesInput = {};
		if (editsPayRate) {
			payChanges = changedPayRateOf(
				{ value: storedPayRate, currency: initialPayCurrency },
				{ value: pay.value, currency: payCurrency }
			);
		}
		const changes = { ...billingChanges, ...payChanges };
		const hasChanges = Object.keys(changes).length > 0;
		if (!hasChanges) {
			onCancel();
			return;
		}
		setIsSaving(true);
		try {
			await onSaveRates(row.id, changes);
			onCancel();
		} catch (saveError) {
			const reasonKey = errorReasonKeyOf(saveError) as DottedLanguageObjectStringPaths;
			setError(t(reasonKey));
		} finally {
			setIsSaving(false);
		}
	};

	const cancelOnEscape = (event: KeyboardEvent<HTMLFormElement>) => {
		if (event.key !== 'Escape') {
			return;
		}
		event.stopPropagation();
		if (isSaving) {
			return;
		}
		onCancel();
	};

	const clearError = () => setError(null);

	return (
		<li>
			<form
				onSubmit={save}
				onKeyDown={cancelOnEscape}
				aria-label={t('rates.EDIT_RATE_OF', { name: row.name })}
				className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start"
			>
				<div className="hidden pt-5 sm:block">
					<MemberAvatar name={row.name} imageUrl={row.imageUrl} />
				</div>
				<div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-[1fr_1.4fr_1fr]">
					<div className="flex min-w-0 flex-col gap-1">
						<label htmlFor={rateId} className={FIELD_LABEL}>
							{t('rates.BILLING_RATE')}
						</label>
						<Input
							id={rateId}
							value={rateText}
							inputMode="decimal"
							autoFocus
							autoComplete="off"
							placeholder={t('rates.NOT_SET')}
							aria-invalid={hasError || undefined}
							aria-describedby={describedByOf(error, errorId)}
							onChange={(event) => {
								setRateText(event.target.value);
								clearError();
							}}
							className="h-8 tabular-nums"
						/>
					</div>
					<div className="flex min-w-0 flex-col gap-1">
						<label htmlFor={currencyId} className={FIELD_LABEL}>
							{t('rates.CURRENCY')}
						</label>
						<CurrencySelect id={currencyId} value={currency} onChange={setCurrency} disabled={isSaving} />
					</div>
					<div className="col-span-2 flex min-w-0 flex-col gap-1 sm:col-span-1">
						<label htmlFor={limitId} className={FIELD_LABEL}>
							{t('rates.WEEKLY_LIMIT')}
						</label>
						<Input
							id={limitId}
							value={limitText}
							inputMode="decimal"
							autoComplete="off"
							placeholder={t('rates.NOT_SET')}
							onChange={(event) => {
								setLimitText(event.target.value);
								clearError();
							}}
							className="h-8 tabular-nums"
						/>
					</div>
					{loadsPayRate && (
						<span
							aria-hidden="true"
							className={cn(SETTINGS_SKELETON_BAR, 'col-span-2 mt-5 block h-4 w-40 sm:col-span-3')}
						/>
					)}
					{payRateReadFailed && (
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => void payRate.refetch()}
							className="col-span-2 justify-self-start sm:col-span-3"
						>
							{t('rates.RATES_RETRY')}
						</Button>
					)}
					{editsPayRate && (
						<>
							<div className="flex min-w-0 flex-col gap-1">
								<label htmlFor={payRateId} className={FIELD_LABEL}>
									{t('rates.PAY_RATE')}
								</label>
								<Input
									id={payRateId}
									value={payText}
									inputMode="decimal"
									autoComplete="off"
									placeholder={t('rates.NOT_SET')}
									aria-invalid={hasError || undefined}
									aria-describedby={describedByOf(error, errorId)}
									onChange={(event) => {
										setPayTextChoice(event.target.value);
										clearError();
									}}
									className="h-8 tabular-nums"
								/>
							</div>
							<div className="flex min-w-0 flex-col gap-1">
								<label htmlFor={payCurrencyId} className={FIELD_LABEL}>
									{t('rates.PAY_CURRENCY')}
								</label>
								<CurrencySelect
									id={payCurrencyId}
									value={payCurrency}
									onChange={setPayCurrencyChoice}
									disabled={isSaving}
								/>
							</div>
							<p className="col-span-2 self-end text-xs text-pretty text-muted-foreground sm:col-span-1">
								{t('rates.PAY_RATE_HINT')}
							</p>
						</>
					)}
					{error && (
						<p id={errorId} role="alert" className="col-span-2 text-xs text-destructive-ink sm:col-span-3">
							{error}
						</p>
					)}
				</div>
				<div className="flex shrink-0 justify-end gap-2 sm:pt-5">
					<Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>
						{t('common.CANCEL')}
					</Button>
					<Button type="submit" size="sm" disabled={isSaving}>
						{isSaving && <Spinner className="size-3.5 animate-spin" />}
						{t('common.SAVE')}
					</Button>
				</div>
			</form>
		</li>
	);
}
