import { Tooltip } from '@/core/components/duplicated-components/tooltip';
import { cn } from '@/core/lib/helpers';
import { useTranslations } from 'next-intl';
import { InvitationRowSkeleton, MemberRowSkeleton } from '@/core/components/teams/member-row-skeleton';
import {
	MEMBER_CARD_PADDING,
	MEMBER_CELL_CENTER,
	MEMBER_GRID_FROM,
	MEMBER_ROW_GRID
} from '@/core/components/teams/member-row-grid';

export function UserTeamCardSkeleton() {
	return <MemberRowSkeleton />;
}

export function InviteUserTeamSkeleton() {
	return <InvitationRowSkeleton />;
}

/** The column labels of the cards view, on the member grid: each label starts where its cells start. */
export function UserTeamCardHeader() {
	return <MemberColumnsHeader />;
}

/**
 * The labels shared by the cards and the table views, on the member grid. Both views show the same columns, the row
 * menu in the narrow last one, so switching views moves nothing.
 */
export function MemberColumnsHeader() {
	const t = useTranslations();
	return (
		<div className={cn(MEMBER_GRID_FROM, 'w-full px-4')}>
			<div className={cn(MEMBER_ROW_GRID, MEMBER_CARD_PADDING, 'h-9 text-xs font-medium text-muted-foreground')}>
				<span className={cn(HEADER_FIRST_LABEL, 'text-nowrap')}>
					{t('common.TEAM')} {t('common.MEMBER')}
				</span>

				<span className={cn(HEADER_LABEL, 'text-nowrap')}>{t('common.TASK')}</span>

				<span className={cn(HEADER_LABEL, MEMBER_CELL_CENTER, 'text-nowrap capitalize')}>
					<Tooltip label={t('task.taskTableHead.TOTAL_WORKED_TODAY_HEADER_TOOLTIP')}>
						{t('dailyPlan.TASK_TIME')}
					</Tooltip>
				</span>

				<span className={cn(HEADER_LABEL, MEMBER_CELL_CENTER, 'text-nowrap')}>{t('common.ESTIMATE')}</span>

				<span className={cn(HEADER_LABEL, MEMBER_CELL_CENTER, 'text-nowrap')}>
					<Tooltip label={t('task.taskTableHead.WORKED_ON_TASK_HEADER_TOOLTIP')}>
						{t('dailyPlan.TOTAL_TODAY')}
					</Tooltip>
				</span>

				<span aria-hidden="true" />
			</div>
		</div>
	);
}

const HEADER_FIRST_LABEL = 'flex items-center pr-4';
const HEADER_LABEL = 'flex items-center px-4';
