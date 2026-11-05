'use client';

import { useTranslations } from 'next-intl';
import { PageSkeletonFrame, ToolbarBandSkeleton } from '@/core/components/layouts/page-skeleton';
import { DASHBOARD_STACK } from '@/core/components/dashboards/kit/recipes';
import { ProjectBudgetBoardSkeleton } from './budget-board';
import { ProjectBudgetPortfolioSkeleton } from './budget-portfolio';

const ACTION_WIDTHS = ['w-29.25'];

const CONTROL_WIDTHS = ['w-45', 'w-21'];

export function ProjectBudgetPageSkeleton() {
	const t = useTranslations();
	return (
		<PageSkeletonFrame
			toolbar={
				<ToolbarBandSkeleton
					title={t('dashboard.projectBudget.TITLE')}
					actionWidths={ACTION_WIDTHS}
					controlWidths={CONTROL_WIDTHS}
				/>
			}
		>
			<div inert className={DASHBOARD_STACK}>
				<ProjectBudgetPortfolioSkeleton />
				<ProjectBudgetBoardSkeleton />
			</div>
		</PageSkeletonFrame>
	);
}
