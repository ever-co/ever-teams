'use client';

import { memo, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { hueStyle } from '@/core/components/common/value-glyphs';
import { cn } from '@/core/lib/helpers';
import {
	type AmountSegment,
	formatOwed,
	owedSegmentsOf,
	rateShownOf,
	type OwedRateSource
} from '@/core/lib/utils/dashboards/payments-due';
import { useWorkspaceLocale } from '@/core/hooks/common/use-workspace-locale';
import { HiddenRate, NoRateChip, RatePlaceholder } from './payments-due-cells';

const NEUTRAL_CHIP_STYLE = hueStyle('neutral');

function segmentKeyOf(segment: AmountSegment, index: number) {
	return `${index}:${segment.text}`;
}

function segmentClassOf(segment: AmountSegment) {
	if (segment.isMinor) {
		return 'text-muted-foreground';
	}
	return undefined;
}

export const OwedAmount = memo(function OwedAmount({
	amount,
	currency,
	showsCode = false,
	className,
	codeClassName = 'text-xs'
}: Readonly<{
	amount: number;
	currency: string | null;
	showsCode?: boolean;
	className?: string;
	codeClassName?: string;
}>) {
	const locale = useWorkspaceLocale();
	const segments = useMemo(() => owedSegmentsOf(amount, currency, locale), [amount, currency, locale]);
	const hasCode = showsCode && Boolean(currency);
	return (
		<span className={cn('inline-flex min-w-0 items-baseline whitespace-nowrap tabular-nums', className)}>
			{segments.map((segment, index) => (
				<span key={segmentKeyOf(segment, index)} className={segmentClassOf(segment)}>
					{segment.text}
				</span>
			))}
			{hasCode && (
				<span className={cn('ml-1.5 font-medium text-muted-foreground', codeClassName)}>{currency}</span>
			)}
		</span>
	);
});

/** The member's rate as an assigned value, "$45.00/h"; a missing rate is the warning chip, never `$0`. */
export const RateChip = memo(function RateChip({
	rate,
	currency,
	rateSource = null,
	ratePending = false
}: Readonly<{
	rate: number | null;
	currency: string | null;
	rateSource?: OwedRateSource | null;
	ratePending?: boolean;
}>) {
	const t = useTranslations();
	const locale = useWorkspaceLocale();
	const shown = rateShownOf({ rate, rateSource, ratePending });
	if (shown === 'loading') {
		return <RatePlaceholder className="ml-0" />;
	}
	if (shown === 'hidden') {
		return <HiddenRate />;
	}
	if (rate === null) {
		return <NoRateChip />;
	}
	return (
		<span
			style={NEUTRAL_CHIP_STYLE}
			className="chip-3d inline-flex h-5 shrink-0 items-center rounded-md px-1.5 text-xs font-medium tabular-nums"
		>
			{formatOwed(rate, currency, locale)}
			<span className="opacity-70">{t('dashboard.paymentsDue.HOUR_UNIT')}</span>
		</span>
	);
});
