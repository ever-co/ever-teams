'use client';

import { memo } from 'react';
import { useLocale } from 'next-intl';
import { cn } from '@/core/lib/helpers';
import { formatOwed } from '@/core/lib/utils/dashboards/payments-due';

const FORMATS = new Map<string, Intl.NumberFormat>();

function currencyFormatOf(locale: string, currency: string) {
	const key = `${locale}|${currency}`;
	const cached = FORMATS.get(key);
	if (cached) {
		return cached;
	}
	const format = new Intl.NumberFormat(locale, { style: 'currency', currency });
	FORMATS.set(key, format);
	return format;
}

interface MoneyParts {
	whole: string;
	cents: string;
}

/** The amount in its currency, split where the cents start, so the cents can be set quieter. */
function moneyPartsOf(amount: number, currency: string | null, locale: string): MoneyParts {
	if (!currency) {
		return { whole: formatOwed(amount, null, locale), cents: '' };
	}
	try {
		const parts = currencyFormatOf(locale, currency).formatToParts(amount);
		let whole = '';
		let cents = '';
		let isPastDecimal = false;
		for (const part of parts) {
			if (part.type === 'decimal') {
				isPastDecimal = true;
			}
			if (isPastDecimal) {
				cents += part.value;
				continue;
			}
			whole += part.value;
		}
		return { whole, cents };
	} catch {
		return { whole: formatOwed(amount, currency, locale), cents: '' };
	}
}

interface MoneyFigureProps {
	amount: number;
	currency: string | null;
	className?: string;
	/** Sets the cents in the muted tone, for a large figure. */
	quietCents?: boolean;
}

/** A money amount in tabular figures; a large one keeps its cents quieter than its whole part. */
export const MoneyFigure = memo(function MoneyFigure({
	amount,
	currency,
	className,
	quietCents = false
}: MoneyFigureProps) {
	const locale = useLocale();
	if (!quietCents) {
		return <span className={cn('tabular-nums', className)}>{formatOwed(amount, currency, locale)}</span>;
	}
	const { whole, cents } = moneyPartsOf(amount, currency, locale);
	return (
		<span className={cn('tabular-nums', className)}>
			{whole}
			{cents && <span className="text-muted-foreground">{cents}</span>}
		</span>
	);
});
