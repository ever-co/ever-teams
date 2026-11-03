'use client';

import { useTranslations } from 'next-intl';
import { Notice } from '@/core/components/common/notice';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import type { OwedFigures } from '@/core/lib/utils/dashboards/payments-due';

type Translate = ReturnType<typeof useTranslations>;

function calloutTitleOf(figures: OwedFigures, t: Translate) {
	const hasPricedTime = figures.currencies.length > 0;
	if (!hasPricedTime) {
		return t('dashboard.paymentsDue.NO_RATES_TITLE');
	}
	const duration = formatDurationShort(figures.unpriced.seconds);
	return t('dashboard.paymentsDue.statements.UNPRICED_TITLE', { count: figures.unpriced.memberCount, duration });
}

/** Time tracked by members without a rate is never priced at zero: the page says how much of it there is. */
export function PaymentsDueUnpricedCallout({ figures }: Readonly<{ figures: OwedFigures | null }>) {
	const t = useTranslations();
	if (!figures) {
		return null;
	}
	const hasUnpricedTime = figures.unpriced.seconds > 0;
	if (!hasUnpricedTime) {
		return null;
	}
	return (
		<Notice
			tone="info"
			title={calloutTitleOf(figures, t)}
			description={t('dashboard.paymentsDue.NO_RATES_MESSAGE')}
		/>
	);
}
