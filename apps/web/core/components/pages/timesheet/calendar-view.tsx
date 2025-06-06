import { GroupedTimesheet, useTimesheet } from '@/core/hooks/activities/use-timesheet';
import { statusColor } from '@/core/components';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/core/components/common/accordion';
import { TranslationHooks, useTranslations } from 'next-intl';
import { EmployeeAvatar, ProjectLogo } from '../../timesheet/compact-timesheet-component';
import { formatDate } from '@/core/lib/helpers/index';
import { ClockIcon, CodeSquareIcon } from 'lucide-react';
import { cn } from '@/core/lib/helpers';
import MonthlyTimesheetCalendar from '../../timesheet/monthly-timesheet-calendar';
import { useTimelogFilterOptions } from '@/core/hooks';
import WeeklyTimesheetCalendar from '../../timesheet/weekly-timesheet-calendar';
import { Checkbox } from '@/core/components/common/checkbox';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import TimesheetSkeleton from '../../activities/timesheet-skeleton';
import {
	DisplayTimeForTimesheet,
	TaskNameInfoDisplay,
	TotalDurationByDate,
	TotalTimeDisplay
} from '../../tasks/task-displays';
import { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { toast } from 'sonner';
import { useRef } from 'react';
interface BaseCalendarDataViewProps {
	t: TranslationHooks;
	data: GroupedTimesheet[];
	daysLabels?: string[];
	CalendarComponent: typeof MonthlyTimesheetCalendar | typeof WeeklyTimesheetCalendar;
}

export function CalendarView({ data, loading }: { data?: GroupedTimesheet[]; loading: boolean }) {
	const t = useTranslations();
	const isToastShown = useRef(false);
	const { timesheetGroupByDays } = useTimelogFilterOptions();
	const defaultDaysLabels = [
		t('common.DAYS.sun'),
		t('common.DAYS.mon'),
		t('common.DAYS.tue'),
		t('common.DAYS.wed'),
		t('common.DAYS.thu'),
		t('common.DAYS.fri'),
		t('common.DAYS.sat')
	];

	if (loading || !data) {
		return (
			<div className="grow h-full w-full bg-[#FFFFFF] dark:bg-dark--theme">
				{Array.from({ length: 10 }).map((_, index) => (
					<TimesheetSkeleton key={index} />
				))}
			</div>
		);
	}

	if (data.length === 0) {
		if (!isToastShown.current) {
			toast.info('CalendarView - No data found, showing empty state');
			isToastShown.current = true;
		}
		return (
			<AnimatedEmptyState
				title={t('pages.timesheet.NO_ENTRIES_FOUND')}
				message={t('common.SELECT_DIFFERENT_DATE')}
			/>
		);
	}
	return (
		<div className="grow h-full w-full bg-[#FFFFFF] dark:bg-dark--theme">
			{(() => {
				switch (timesheetGroupByDays) {
					case 'Monthly':
						return <MonthlyCalendarDataView data={data} daysLabels={defaultDaysLabels} t={t} />;
					case 'Weekly':
						return <WeeklyCalendarDataView data={data} daysLabels={defaultDaysLabels} t={t} />;
					default:
						return <CalendarDataView data={data} t={t} />;
				}
			})()}
		</div>
	);
}
const CalendarDataView = ({ data }: { data?: GroupedTimesheet[]; t: TranslationHooks }) => {
	const { getStatusTimesheet, handleSelectRowTimesheet, selectTimesheetId, groupedByTimesheetIds } = useTimesheet({});

	return (
		<div className="w-full dark:bg-dark--theme">
			<div className="rounded-md">
				{data?.map((plan, index) => {
					return (
						<div key={index}>
							<div
								className={cn(
									'h-[40px] flex justify-between items-center w-full',
									'bg-[#ffffffcc] dark:bg-dark--theme rounded-md border-1',
									'border-gray-400 px-5 text-[#71717A] font-medium'
								)}
							>
								<div className="flex gap-x-3">
									<span>{formatDate(plan.date)}</span>
								</div>
								<div className="flex items-center gap-x-1">
									<span className="text-[#868687]">Total{' : '}</span>

									<TotalDurationByDate
										timesheetLog={plan.tasks}
										createdAt={formatDate(plan.date)}
										className="text-sm text-black dark:text-gray-500"
									/>
								</div>
							</div>
							<Accordion type="single" collapsible>
								{Object.entries(getStatusTimesheet(plan.tasks)).map(([status, rows]) => {
									const groupedByTimesheetId = groupedByTimesheetIds({ rows });
									return Object.entries(groupedByTimesheetId).map(([timesheetId, timesheetRows]) => {
										return (
											timesheetRows.length > 0 &&
											status && (
												<AccordionItem
													key={`${status}-${timesheetId}`}
													value={`${status === 'DENIED' ? 'REJECTED' : status}-${timesheetId}`}
													className="p-1 rounded"
												>
													<AccordionTrigger
														type="button"
														className={cn(
															'flex flex-row-reverse justify-end items-center w-full h-[30px] rounded-sm gap-x-2 hover:no-underline px-2',
															statusColor(status).text
														)}
													>
														<div className="flex items-center justify-between w-full space-x-1">
															<div className="flex items-center w-full gap-2">
																<div
																	className={cn(
																		'p-2 rounded',
																		statusColor(status).bg
																	)}
																></div>
																<div className="flex items-center gap-x-1">
																	<span className="text-base font-medium text-[#71717A] uppercase !text-[14px]">
																		{status === 'DENIED' ? 'REJECTED' : status}
																	</span>
																	<span className="text-gray-400 text-[14px]">
																		({timesheetRows.length})
																	</span>
																</div>
															</div>
															<div className="flex items-center space-x-2">
																<ClockIcon className=" text-[12px] h-3 w-3" />
																<TotalTimeDisplay timesheetLog={timesheetRows} />
															</div>
														</div>
													</AccordionTrigger>
													<AccordionContent className="flex flex-col w-full gap-y-2">
														{timesheetRows.map((task) => (
															<div
																key={task.id}
																style={{
																	backgroundColor: statusColor(status).bgOpacity,
																	borderLeftColor: statusColor(status).border
																}}
																className={cn(
																	'flex flex-col gap-2 items-start p-2 space-x-4 rounded-l border-l-4 group/item'
																)}
															>
																<div className="flex items-center justify-between w-full pl-3">
																	<div className="flex items-center gap-x-1">
																		<EmployeeAvatar
																			imageUrl={
																				task.employee?.user.imageUrl ?? ''
																			}
																			className="w-[28px] h-[28px] drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)] rounded-full"
																		/>
																		<span className=" font-normal text-[#3D5A80] dark:text-[#7aa2d8]">
																			{task.employee?.fullName}
																		</span>
																	</div>
																	<DisplayTimeForTimesheet timesheetLog={task} />
																</div>
																<TaskNameInfoDisplay
																	task={task.task}
																	className={cn(
																		'rounded-sm h-auto !px-[0.3312rem] py-[0.2875rem] shadow-[0px_0px_15px_0px_#e2e8f0] dark:shadow-transparent'
																	)}
																	taskTitleClassName={cn(
																		'text-sm text-ellipsis overflow-hidden !text-[#293241] dark:!text-white '
																	)}
																	showSize={true}
																	dash
																	taskNumberClassName="text-sm"
																/>
																<div className="flex items-center justify-between w-full pr-3">
																	<div className="flex flex-row items-center self-stretch flex-none flex-grow-0 gap-2 py-0">
																		{task.project?.imageUrl && (
																			<ProjectLogo
																				className="w-[28px] h-[28px] drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)] rounded-[8px]"
																				imageUrl={task.project.imageUrl}
																			/>
																		)}
																		<span className="!text-ellipsis !overflow-hidden !truncate !text-[#3D5A80] dark:!text-[#7aa2d8] flex-1">
																			{task.project?.name ?? 'No Project'}
																		</span>
																	</div>
																	<CheckBoxTimesheet
																		handleSelectRowTimesheet={
																			handleSelectRowTimesheet
																		}
																		timesheet={task}
																		selectTimesheetId={selectTimesheetId}
																	/>
																</div>
															</div>
														))}
													</AccordionContent>
												</AccordionItem>
											)
										);
									});
								})}
							</Accordion>
						</div>
					);
				})}
			</div>
		</div>
	);
};

const BaseCalendarDataView = ({ data, daysLabels, t, CalendarComponent }: BaseCalendarDataViewProps) => {
	const { getStatusTimesheet, handleSelectRowTimesheet, selectTimesheetId, groupedByTimesheetIds } = useTimesheet({});

	return (
		<CalendarComponent
			t={t}
			data={data}
			// locale={ }
			daysLabels={daysLabels}
			renderDayContent={(date, plan) => {
				return (
					<>
						{plan ? (
							<Accordion type="single" collapsible className="w-full">
								{Object.entries(getStatusTimesheet(plan.tasks)).map(([status, rows]) => {
									const groupedByTimesheetId = groupedByTimesheetIds({ rows });
									return Object.entries(groupedByTimesheetId).map(([timesheetId, timesheetRows]) => {
										return (
											timesheetRows.length > 0 &&
											status && (
												<AccordionItem
													key={`${status}-${timesheetId}`}
													value={`${status === 'DENIED' ? 'REJECTED' : status}-${timesheetId}`}
													className="p-1 rounded"
												>
													<AccordionTrigger
														type="button"
														className={cn(
															'flex flex-row-reverse justify-end items-center w-full !h-[16px] rounded-sm gap-x-2 hover:no-underline',
															statusColor(status).text
														)}
													>
														<div className="flex items-center justify-between w-full space-x-1">
															<div className="flex items-center w-full gap-2">
																<div
																	className={cn(
																		'p-2 rounded',
																		statusColor(status).bg
																	)}
																></div>
																<div className="flex items-center gap-x-1">
																	<span className="text-base font-normal text-gray-400 uppercase !text-[13px]">
																		{status === 'DENIED' ? 'REJECTED' : status}
																	</span>
																	<span className="text-gray-400 text-[13px]">
																		({timesheetRows.length})
																	</span>
																</div>
															</div>
															<div className="flex items-center space-x-2">
																<ClockIcon className=" text-[12px] h-3 w-3" />
																<TotalTimeDisplay timesheetLog={timesheetRows} />
															</div>
														</div>
													</AccordionTrigger>
													<AccordionContent className="flex flex-col items-start flex-none flex-grow-0 order-1 p-0 overflow-auto gap-y-2">
														{timesheetRows.map((task) => (
															<div
																key={task.id}
																style={{
																	backgroundColor: statusColor(status).bgOpacity,
																	borderLeftColor: statusColor(status).border
																}}
																className={cn(
																	'group/item border-l-4 rounded-l space-x-4  box-border flex flex-col items-start py-2.5 gap-2 w-[258px] rounded-tr-md rounded-br-md flex-none order-1 self-stretch flex-grow'
																)}
															>
																<div className="flex items-center justify-between w-full pl-3">
																	<div className="flex items-center gap-x-1">
																		<EmployeeAvatar
																			className="w-[28px] h-[28px] drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)] rounded-full"
																			imageUrl={
																				task.employee?.user.imageUrl ?? ''
																			}
																		/>
																		<span className="font-normal text-[#3D5A80] dark:text-[#7aa2d8]">
																			{task.employee?.fullName}
																		</span>
																	</div>
																	<DisplayTimeForTimesheet timesheetLog={task} />
																</div>
																<TaskNameInfoDisplay
																	task={task.task}
																	className={cn(
																		'rounded-sm h-auto !px-[0.3312rem] py-[0.2875rem]  shadow-[0px_0px_15px_0px_#e2e8f0] dark:shadow-transparent '
																	)}
																	taskTitleClassName={cn(
																		'text-sm  !text-ellipsis overflow-hidden !truncate !text-[#293241] dark:!text-white'
																	)}
																	showSize={false}
																	dash
																	taskNumberClassName="text-sm"
																/>
																<div className="flex items-center justify-between w-full">
																	<div className="flex flex-row items-center self-stretch flex-none flex-grow-0 gap-2 py-0">
																		{task.project?.imageUrl && (
																			<ProjectLogo
																				className="w-[28px] h-[28px] drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)] rounded-[8px]"
																				imageUrl={task.project.imageUrl}
																			/>
																		)}
																		<span className="!text-ellipsis !overflow-hidden !truncate !text-[#3D5A80] dark:!text-[#7aa2d8] flex-1">
																			{task.project?.name ?? 'No Project'}
																		</span>
																	</div>
																	<CheckBoxTimesheet
																		handleSelectRowTimesheet={
																			handleSelectRowTimesheet
																		}
																		timesheet={task}
																		selectTimesheetId={selectTimesheetId}
																	/>
																</div>
															</div>
														))}
													</AccordionContent>
												</AccordionItem>
											)
										);
									});
								})}
							</Accordion>
						) : (
							<div className="text-gray-400 text-sm flex items-center justify-center min-h-[150px] sm:w-[250px] md:w-[300px] lg:w-[350px] max-w-full gap-2">
								<CodeSquareIcon />
								<span>No Data</span>
							</div>
						)}
					</>
				);
			}}
		/>
	);
};

const MonthlyCalendarDataView = (props: { data: GroupedTimesheet[]; t: TranslationHooks; daysLabels?: string[] }) => (
	<BaseCalendarDataView {...props} CalendarComponent={MonthlyTimesheetCalendar} />
);

const WeeklyCalendarDataView = (props: { data: GroupedTimesheet[]; t: TranslationHooks; daysLabels?: string[] }) => (
	<BaseCalendarDataView {...props} CalendarComponent={WeeklyTimesheetCalendar} />
);

export const CheckBoxTimesheet = ({
	selectTimesheetId,
	timesheet,
	handleSelectRowTimesheet
}: {
	selectTimesheetId: ITimeLog[];
	timesheet: ITimeLog;
	handleSelectRowTimesheet: (items: ITimeLog) => void;
}) => {
	return (
		<Checkbox
			className={cn(
				'group/edit invisible w-5 h-5 select-auto group-hover/item:visible',
				selectTimesheetId.includes(timesheet) && 'visible'
			)}
			onCheckedChange={() => handleSelectRowTimesheet(timesheet)}
			checked={selectTimesheetId.includes(timesheet)}
		/>
	);
};
