'use client';

import { memo, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import {
	dayDateOf,
	dayNameOf,
	fallsBackToBillingRate,
	formatOwed,
	type OwedRateSource
} from '@/core/lib/utils/dashboards/payments-due';

export const MISSING_FIGURE = '–';

/** "Pay rate not set, showing the billing rate" for a line or member the billing rate priced, else nothing. */
export function useBillingRateNote(rateSource: OwedRateSource | null): string | undefined {
	const t = useTranslations();
	const fallsBack = fallsBackToBillingRate(rateSource);
	if (!fallsBack) {
		return undefined;
	}
	return t('dashboard.paymentsDue.PAY_RATE_NOT_SET');
}

/** The member's meta line with the billing rate note after it, when there is one. */
export function metaWithNote(meta: string | undefined, note: string | undefined): string | undefined {
	if (!note) {
		return meta;
	}
	if (!meta) {
		return note;
	}
	return `${meta} · ${note}`;
}

const FIGURE_TEXT = 'truncate text-right text-[13px] tabular-nums';

export function NoRateChip({ className }: Readonly<{ className?: string }>) {
	const t = useTranslations();
	return (
		<span
			className={cn(
				'inline-flex h-5 shrink-0 items-center rounded-md bg-warning/10 px-1.5 text-xs font-medium text-warning-foreground',
				className
			)}
		>
			{t('dashboard.paymentsDue.NO_RATE')}
		</span>
	);
}

/** "$45.00/h" with the unit muted, or the "No rate set" chip: a missing rate is never written as `$0`. */
export const RateValue = memo(function RateValue({
	rate,
	currency,
	className
}: Readonly<{ rate: number | null; currency: string | null; className?: string }>) {
	const t = useTranslations();
	const locale = useLocale();
	if (rate === null) {
		return <NoRateChip className={className} />;
	}
	return (
		<span className={cn(FIGURE_TEXT, className)}>
			<span className="text-foreground">{formatOwed(rate, currency, locale)}</span>
			<span className="text-muted-foreground">{t('dashboard.paymentsDue.HOUR_UNIT')}</span>
		</span>
	);
});

export function TrackedValue({ seconds, className }: Readonly<{ seconds: number; className?: string }>) {
	return <span className={cn(FIGURE_TEXT, 'text-foreground', className)}>{formatDurationShort(seconds)}</span>;
}

export const OwedValue = memo(function OwedValue({
	amount,
	currency,
	isStrong = false,
	className
}: Readonly<{ amount: number | null; currency: string | null; isStrong?: boolean; className?: string }>) {
	const locale = useLocale();
	if (amount === null) {
		return <span className={cn(FIGURE_TEXT, 'text-muted-foreground', className)}>{MISSING_FIGURE}</span>;
	}
	return (
		<span className={cn(FIGURE_TEXT, 'text-foreground', isStrong && 'font-semibold', className)}>
			{formatOwed(amount, currency, locale)}
		</span>
	);
});

export function OwedFormula({
	seconds,
	rate,
	currency,
	className
}: Readonly<{ seconds: number; rate: number | null; currency: string | null; className?: string }>) {
	const t = useTranslations();
	const locale = useLocale();
	const duration = formatDurationShort(seconds);
	if (rate === null) {
		return <span className={cn('truncate text-xs tabular-nums text-muted-foreground', className)}>{duration}</span>;
	}
	const rateText = formatOwed(rate, currency, locale);
	return (
		<span className={cn('truncate text-xs tabular-nums text-muted-foreground', className)}>
			{t('dashboard.paymentsDue.FORMULA', { duration, rate: rateText })}
		</span>
	);
}

function boldDayName(chunks: ReactNode) {
	return <span className="font-semibold">{chunks}</span>;
}

export function DayName({ day, className }: Readonly<{ day: Date; className?: string }>) {
	const t = useTranslations();
	const locale = useLocale();
	const name = dayNameOf(day, locale, { today: t('common.TODAY'), yesterday: t('common.YESTERDAY') });
	const date = dayDateOf(day, locale);
	const label = t.rich('dashboard.paymentsDue.DAY_LABEL', {
		day: name,
		date,
		name: boldDayName
	});
	return <span className={cn('truncate text-[13px] tabular-nums text-foreground', className)}>{label}</span>;
}
