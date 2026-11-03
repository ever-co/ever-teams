import { formatDate } from '@/core/lib/helpers/index';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/core/components/common/accordion';
import { Button } from '@/core/components';
import { useTranslations } from 'next-intl';
import { ReactNode } from 'react';
import { EmployeeAvatar } from '../../timesheet/compact-timesheet-component';
import { getStatusTimesheet, groupByDate } from '@/core/lib/helpers/timesheet-grouping';
import { useTimelogFilterOptions } from '@/core/hooks';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import { cn } from '@/core/lib/helpers';
import { ChevronRight } from '@/core/components/icons';
import {
	DisplayTimeForTimesheet,
	TaskNameInfoDisplay,
	TotalDurationByDate,
	TotalTimeDisplay
} from '../../tasks/task-displays';
import { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { TimesheetStatusBadge, TimesheetTotalBadge } from '../../timesheet/timesheet-status-badge';

interface ITimesheetCard {
	title?: string;
	date?: string;
	description?: string;
	hours?: string;
	count?: number;
	color?: string;
	icon?: ReactNode;
	classNameIcon?: string;
	onClick?: () => void;
}

export function TimesheetCard({ ...props }: ITimesheetCard) {
	const { icon, title, date, description, hours, count, onClick, classNameIcon } = props;
	const t = useTranslations();
	return (
		<div aria-label={`Timesheet card for ${title}`} className="flex min-w-0 flex-1 items-start gap-3 p-4">
			<div
				className={cn(
					'flex size-9 shrink-0 items-center justify-center rounded-lg',
					'bg-foreground/5 text-muted-foreground [&_svg]:size-4.5',
					classNameIcon
				)}
				aria-hidden="true"
			>
				{icon}
			</div>
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<span className="w-full truncate text-xs text-muted-foreground">{title}</span>
				<span className="w-full truncate text-2xl font-semibold tabular-nums text-foreground">
					{hours ?? count}
				</span>
				<span className="w-full truncate text-xs text-muted-foreground">{date ?? description}</span>
				<Button
					variant="ghost"
					size="default"
					className="-ml-3 mt-1 w-fit text-muted-foreground"
					aria-label="View timesheet details"
					onClick={onClick}
				>
					<span>{t('pages.timesheet.TIMESHEET_VIEW_DETAILS')}</span>
					<ChevronRight />
				</Button>
			</div>
		</div>
	);
}

export const TimesheetCardDetail = ({ data }: { data?: Record<ETimesheetStatus, ITimeLog[]> }) => {
	// getStatusTimesheet & groupByDate imported as pure functions from timesheet-grouping
	const { timesheetGroupByDays } = useTimelogFilterOptions();
	const timesheetGroupByDate = groupByDate(data?.PENDING || []);
	const t = useTranslations();
	return (
		<div className="overflow-hidden rounded-xl hairline-ring ring-border">
			{timesheetGroupByDate.map((plan, index) => {
				return (
					<div key={index} className="hairline-b border-border last:border-b-0">
						<div
							className={cn(
								'flex h-10 w-full items-center justify-between gap-3 px-4',
								'bg-foreground/2.5 text-sm font-medium text-foreground'
							)}
						>
							<div className="flex gap-x-3">
								{timesheetGroupByDays === 'Weekly' && <span>Week {index + 1}</span>}
								<span>{formatDate(plan.date)}</span>
							</div>
							<TotalDurationByDate
								timesheetLog={plan.tasks}
								createdAt={formatDate(plan.date)}
								className="tabular-nums text-foreground"
							/>
						</div>
						<Accordion type="single" collapsible>
							{Object.entries(getStatusTimesheet(plan.tasks)).map(([status, rows]) => {
								return (
									rows.length > 0 &&
									status && (
										<AccordionItem
											key={status}
											value={status === 'DENIED' ? 'REJECTED' : status}
											className="hairline-t border-b-0 border-border"
										>
											<AccordionTrigger
												type="button"
												className={cn(
													'flex h-11 w-full flex-row-reverse items-center justify-end gap-x-2 px-4 py-0',
													'text-muted-foreground transition-colors hover:bg-foreground/2.5 hover:no-underline'
												)}
											>
												<div className="flex w-full items-center justify-between gap-2">
													<div className="flex items-center gap-2">
														<TimesheetStatusBadge status={status}>
															<span>{status === 'DENIED' ? 'REJECTED' : status}</span>
															<span className="tabular-nums">({rows.length})</span>
														</TimesheetStatusBadge>
														<TimesheetTotalBadge
															label={
																<>
																	{t('timer.TOTAL_HOURS').split(' ')[0]}
																	{':'}
																</>
															}
														>
															<TotalTimeDisplay
																timesheetLog={rows}
																className="text-foreground"
															/>
														</TimesheetTotalBadge>
													</div>
												</div>
											</AccordionTrigger>
											<AccordionContent className="flex w-full flex-col pb-0">
												{rows.map((task) => (
													<div
														key={task.id}
														className={cn(
															'flex min-h-14 items-center gap-4 hairline-t border-border px-4 py-2',
															'transition-colors hover:bg-foreground/2.5'
														)}
													>
														<div className="min-w-0 flex-2">
															<TaskNameInfoDisplay
																task={task.task}
																className="min-w-0"
																taskTitleClassName="text-sm text-foreground"
																showSize={false}
																dash
																taskNumberClassName="text-sm text-muted-foreground"
															/>
														</div>
														<div className="flex min-w-0 flex-1 items-center gap-x-2">
															<EmployeeAvatar
																className="size-7 rounded-full object-cover hairline-ring ring-border"
																imageUrl={task.employee?.user.imageUrl!}
															/>
															<span className="flex-1 truncate text-sm font-medium">
																{task.employee?.fullName}
															</span>
														</div>
														<div className="ml-auto flex shrink-0 justify-end tabular-nums">
															<DisplayTimeForTimesheet timesheetLog={task} />
														</div>
													</div>
												))}
											</AccordionContent>
										</AccordionItem>
									)
								);
							})}
						</Accordion>
					</div>
				);
			})}
		</div>
	);
};
