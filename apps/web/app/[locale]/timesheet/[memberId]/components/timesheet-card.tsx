import { formatDate } from '@/app/helpers';
import {
	DisplayTimeForTimesheet,
	TaskNameInfoDisplay,
	TotalDurationByDate,
	TotalTimeDisplay
} from '@/core/components/features';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/core/components/ui/accordion';
import { Badge } from '@/core/components/ui/badge';
import { ArrowRightIcon } from 'assets/svg';
import { Button, Card, statusColor } from '@/core/components';
import { useTranslations } from 'next-intl';
import { ReactNode } from 'react';
import { EmployeeAvatar } from './compact-timesheet-component';
import { useTimesheet } from '@/core/hooks/features/useTimesheet';
import { useTimelogFilterOptions } from '@/core/hooks';
import { TimesheetLog, TimesheetStatus } from '@/core/types/interfaces';
import { cn } from '@/core/lib/helpers';
import { PlusIcon } from './timesheet-icons';

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
		<Card
			aria-label={`Timesheet card for ${title}`}
			shadow="custom"
			className="w-full  h-[175px] rounded-md border border-gray-200 dark:border-gray-600 flex  gap-[8px] shadow shadow-gray-100 dark:shadow-transparent p-[24px]"
		>
			<div className="!gap-8 w-full space-y-4 ">
				<div className="flex flex-col items-start justify-start gap-1">
					<h1 className="text-2xl md:text-[25px] font-bold truncate w-full">{hours ?? count}</h1>
					<h2 className="text-base md:text-[16px] font-medium text-[#282048] dark:text-gray-400 truncate w-full">
						{title}
					</h2>
					<span className="text-sm md:text-[14px] text-[#3D5A80] dark:text-gray-400 truncate w-full">
						{date ?? description}
					</span>
				</div>
				<Button
					variant="outline"
					className={cn(
						'h-9 px-2 py-2',
						'border border-gray-200 ',
						'text-[#282048] text-sm',
						'flex items-center',
						'hover:bg-gray-50 hover:dark:bg-primary-light/40 focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 dark:border-gray-600'
					)}
					aria-label="View timesheet details"
					onClick={onClick}
				>
					<PlusIcon />
					<span>{t('pages.timesheet.TIMESHEET_VIEW_DETAILS')}</span>
					<ArrowRightIcon className={cn('h-6 w-6', 'text-[#282048] dark:text-[#6b7280]')} />
				</Button>
			</div>
			<div
				className={cn(
					'p-5 w-16 h-16 rounded-lg',
					'flex justify-center items-center',
					'text-sm font-bold text-white',
					'shadow-lg dark:shadow-gray-800',
					classNameIcon
				)}
				aria-hidden="true"
			>
				{icon}
			</div>
		</Card>
	);
}

export const TimesheetCardDetail = ({ data }: { data?: Record<TimesheetStatus, TimesheetLog[]> }) => {
	const { getStatusTimesheet, groupByDate } = useTimesheet({});
	const { timesheetGroupByDays } = useTimelogFilterOptions();
	const timesheetGroupByDate = groupByDate(data?.PENDING || []);
	const t = useTranslations();
	return (
		<div className="rounded-md">
			{timesheetGroupByDate.map((plan, index) => {
				return (
					<div key={index}>
						<div
							className={cn(
								'h-[48px] flex justify-between items-center w-full',
								'bg-[#ffffffcc] dark:bg-dark--theme rounded-md border-1',
								'border-gray-400 px-5 text-[#71717A] font-medium'
							)}
						>
							<div className="flex gap-x-3">
								{timesheetGroupByDays === 'Weekly' && <span>Week {index + 1}</span>}
								<span>{formatDate(plan.date)}</span>
							</div>
							<TotalDurationByDate timesheetLog={plan.tasks} createdAt={formatDate(plan.date)} />
						</div>
						<Accordion type="single" collapsible>
							{Object.entries(getStatusTimesheet(plan.tasks)).map(([status, rows]) => {
								return (
									rows.length > 0 &&
									status && (
										<AccordionItem
											key={status}
											value={status === 'DENIED' ? 'REJECTED' : status}
											className={cn('p-1 rounded')}
										>
											<AccordionTrigger
												style={{ backgroundColor: statusColor(status).bgOpacity }}
												type="button"
												className={cn(
													'flex flex-row-reverse justify-end items-center w-full h-[50px] rounded-sm gap-x-2 hover:no-underline px-2',
													statusColor(status).text
												)}
											>
												<div className="flex items-center justify-between w-full space-x-1">
													<div className="flex items-center space-x-1">
														<div
															className={cn('p-2 rounded', statusColor(status).bg)}
														></div>
														<div className="flex items-center gap-x-1">
															<span className="text-base font-normal text-gray-400 uppercase">
																{status === 'DENIED' ? 'REJECTED' : status}
															</span>
															<span className="text-gray-400 text-[14px]">
																({rows.length})
															</span>
														</div>
														<Badge
															variant={'outline'}
															className="box-border flex flex-row items-center px-2 py-1 gap-2 w-[108px] h-[30px] bg-[rgba(247,247,247,0.6)] border border-gray-300 rounded-lg flex-none order-1 flex-grow-0"
														>
															<span className="text-[#5f5f61]">
																{t('timer.TOTAL_HOURS').split(' ')[0]}
																{':'}
															</span>
															<TotalTimeDisplay
																timesheetLog={rows}
																className="text-[#293241] text-[14px]"
															/>
														</Badge>
													</div>
												</div>
											</AccordionTrigger>
											<AccordionContent className="flex flex-col w-full">
												{rows.map((task) => (
													<div
														key={task.id}
														style={{
															backgroundColor: statusColor(status).bgOpacity,
															borderBottomColor: statusColor(status).bg
														}}
														className={cn(
															'flex items-center p-1 space-x-4 border-b border-b-gray-200 dark:border-b-gray-600 h-[60px]'
														)}
													>
														<div className="flex-[2]">
															<TaskNameInfoDisplay
																task={task.task}
																className={cn(
																	'rounded-sm !h-auto !px-[0.3312rem] py-[0.2875rem] shadow-[0px_0px_15px_0px_#e2e8f0] dark:shadow-transparent'
																)}
																taskTitleClassName={cn(
																	'text-sm !text-ellipsis !overflow-hidden text-sm'
																)}
																showSize={false}
																dash
																taskNumberClassName="text-sm"
															/>
														</div>
														<div className="flex items-center flex-1 gap-x-2">
															<EmployeeAvatar imageUrl={task.employee.user.imageUrl!} />
															<span className="flex-1 font-medium text-[12px] overflow-hidden">
																{task.employee.fullName}
															</span>
														</div>
														<DisplayTimeForTimesheet timesheetLog={task} />
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
