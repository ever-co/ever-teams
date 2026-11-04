'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { MoreHorizontal, Trash } from '@/core/components/icons';
import { ConfirmDestructiveDialog } from '@/core/components/settings/kit/danger';
import { usePlanDayLabel } from '@/core/components/tasks/daily-plan/plan-day-label';
import { useDeleteDailyPlan } from '@/core/hooks/daily-plans/use-delete-daily-plan';
import { logErrorInDev } from '@/core/lib/helpers/error-message';
import { TDailyPlan } from '@/core/types/schemas';

export function PlanMenu({ plan }: Readonly<{ plan: TDailyPlan }>) {
	const t = useTranslations();
	const dayLabelOf = usePlanDayLabel();
	const [isConfirmOpen, setIsConfirmOpen] = useState(false);
	const { deleteDailyPlan, deleteDailyPlanLoading } = useDeleteDailyPlan();
	const taskCount = plan.tasks?.length ?? 0;

	const deletePlan = async () => {
		try {
			if (plan.id) {
				await deleteDailyPlan(plan.id);
			}
		} catch (error) {
			logErrorInDev('Failed to delete the plan', error);
		} finally {
			setIsConfirmOpen(false);
		}
	};

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						aria-label={t('common.MORE_OPTIONS')}
						className="size-6 text-muted-foreground [&_svg]:size-4"
					>
						<MoreHorizontal aria-hidden="true" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-48">
					<DropdownMenuItem variant="destructive" onClick={() => setIsConfirmOpen(true)}>
						<Trash aria-hidden="true" />
						{t('common.plan.DELETE_THIS_PLAN')}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<ConfirmDestructiveDialog
				open={isConfirmOpen}
				onClose={() => setIsConfirmOpen(false)}
				title={t('common.plan.DELETE_THIS_PLAN')}
				description={t('common.plan.DELETE_PLAN_CONFIRM')}
				subject={
					<p className="flex items-center gap-2 rounded-lg bg-foreground/[0.03] px-3 py-2 text-[13px] text-foreground">
						<span className="min-w-0 truncate font-medium">{dayLabelOf(plan.date)}</span>
						<span className="text-muted-foreground">
							{t('dashboard.timesheets.SHEET.TASK_COUNT', { count: taskCount })}
						</span>
					</p>
				}
				confirmLabel={t('common.DELETE')}
				isPending={deleteDailyPlanLoading}
				onConfirm={() => void deletePlan()}
			/>
		</>
	);
}
