'use client';

import { useTranslations } from 'next-intl';
import { SegmentedControl } from '@/core/components/common/segmented-control';
import type { PaymentsGrouping } from '@/core/lib/utils/dashboards/payments-due';

export function PaymentsGroupingControl({
	grouping,
	onGroupingChange
}: Readonly<{ grouping: PaymentsGrouping; onGroupingChange: (grouping: PaymentsGrouping) => void }>) {
	const t = useTranslations();
	const items = [
		{ value: 'member' as const, label: t('dashboard.paymentsDue.GROUPING_MEMBER') },
		{ value: 'day' as const, label: t('dashboard.paymentsDue.GROUPING_DAY') }
	];
	return (
		<SegmentedControl<PaymentsGrouping>
			items={items}
			value={grouping}
			onValueChange={onGroupingChange}
			ariaLabel={t('dashboard.paymentsDue.GROUPING_LABEL')}
		/>
	);
}
