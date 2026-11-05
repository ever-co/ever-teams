'use client';

import { useTranslations } from 'next-intl';
import { PageSkeletonFrame, ToolbarBandSkeleton } from '@/core/components/layouts/page-skeleton';
import { DASHBOARD_STACK } from '@/core/components/dashboards/kit/recipes';
import { PaymentsDueBalanceTilesSkeleton } from './payments-due-balance-tiles';
import { PaymentsDueStatementsSkeleton } from './payments-due-statements';

const ACTION_WIDTHS = ['w-29.25'];

const CONTROL_WIDTHS = ['w-41.75', 'w-21'];

const TRAILING_WIDTHS = ['w-46'];

export function PaymentsDuePageSkeleton() {
	const t = useTranslations();
	return (
		<PageSkeletonFrame
			toolbar={
				<ToolbarBandSkeleton
					title={t('dashboard.paymentsDue.TITLE')}
					actionWidths={ACTION_WIDTHS}
					controlWidths={CONTROL_WIDTHS}
					trailingWidths={TRAILING_WIDTHS}
				/>
			}
		>
			<div inert className={DASHBOARD_STACK}>
				<PaymentsDueBalanceTilesSkeleton />
				<PaymentsDueStatementsSkeleton />
			</div>
		</PageSkeletonFrame>
	);
}
