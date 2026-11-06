import type { GroupedTimesheet } from '@/core/lib/helpers/timesheet-grouping';
import { getStatusTimesheet, groupedByTimesheetIds } from '@/core/lib/helpers/timesheet-grouping';
import { useTimesheetQuery } from '@/core/hooks/timesheet/use-timesheet-query';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/core/components/common/accordion';
import { TranslationHooks, useTranslations } from 'next-intl';
import { EmployeeAvatar, ProjectLogo } from '../../timesheet/compact-timesheet-component';
import { formatDate } from '@/core/lib/helpers/index';
import { Clock, CodeBlock } from '@/core/components/icons';
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
import { TimesheetStatusBadge } from '../../timesheet/timesheet-status-badge';
import { timesheetStatusAccentClass, timesheetStatusLabel } from '../../timesheet/timesheet-status-tone';
interface BaseCalendarDataViewProps {
	t: TranslationHooks;
	data: GroupedTimesheet[];
	daysLabels?: string[];
	CalendarComponent: typeof MonthlyTimesheetCalendar | typeof WeeklyTimesheetCalendar;
}

export function CalendarView({ data, loading }: { data?: GroupedTimesheet[]; loading: boolean }) {
	const t = useTranslations();
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
			<div className="grow h-full w-full">
				{Array.from({ length: 10 }).map((_, index) => (
					<TimesheetSkeleton key={index} />
				))}
			</div>
		);
	}

	if (data.length === 0) {
		return (
			<AnimatedEmptyState
				title={t('pages.timesheet.NO_ENTRIES_FOUND')}
				message={t('common.SELECT_DIFFERENT_DATE')}
				showBorder={false}
				noBg
			/>
		);
	}
	return (
		<div className="grow h-full w-full">
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
	const { handleSelectRowTimesheet, selectTimesheetId } = useTimesheetQuery({});

	return (
		<div className="w-full">
			<div className="hairline-divide-y divide-border">
				{data?.map((plan, index) => {
					return (
						<div key={index}>
							<div
								className={cn(
									'flex h-10 w-full items-center justify-between gap-3 px-4',
									'bg-foreground/2.5 text-sm font-medium text-foreground'
								)}
							>
								<div className="flex gap-x-3">
									<span>{formatDate(plan.date)}</span>
								</div>
								<div className="flex items-center gap-x-1">
									<span className="font-normal text-muted-foreground">Total{' : '}</span>

									<TotalDurationByDate
										timesheetLog={plan.tasks}
										createdAt={formatDate(plan.date)}
										className="text-sm tabular-nums text-foreground"
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
													className="hairline-t border-b-0 border-border"
												>
													<AccordionTrigger
														type="button"
														className={cn(
															'flex h-10 w-full flex-row-reverse items-center justify-end gap-x-2 px-4 py-0',
															'text-muted-foreground transition-colors hover:bg-foreground/2.5 hover:no-underline'
														)}
													>
														<div className="flex w-full items-center justify-between gap-3">
															<div className="flex w-full items-center gap-2">
																<TimesheetStatusBadge status={status}>
																	<span>{timesheetStatusLabel(status)}</span>
																	<span className="tabular-nums">
																		({timesheetRows.length})
																	</span>
																</TimesheetStatusBadge>
															</div>
															<div className="flex items-center gap-1.5 text-sm">
																<Clock className="size-3.5 text-muted-foreground" />
																<TotalTimeDisplay
																	timesheetLog={timesheetRows}
																	className="tabular-nums text-foreground"
																/>
															</div>
														</div>
													</AccordionTrigger>
													<AccordionContent className="flex w-full flex-col gap-y-2 px-4 pb-3">
														{timesheetRows.map((task) => (
															<div
																key={task.id}
																className={cn(
																	'group/item flex flex-col items-start gap-2 rounded-r-md border-l-[3px] bg-foreground/3 p-2.5',
																	timesheetStatusAccentClass(status)
																)}
															>
																<div className="flex items-center justify-between w-full">
																	<div className="flex items-center gap-x-1">
																		<EmployeeAvatar
																			imageUrl={
																				task.employee?.user.imageUrl ?? ''
																			}
																			className="size-6 rounded-full object-cover hairline-ring ring-border"
																		/>
																		<span className="text-sm text-foreground">
																			{task.employee?.fullName}
																		</span>
																	</div>
																	<DisplayTimeForTimesheet timesheetLog={task} />
																</div>
																<TaskNameInfoDisplay
																	task={task.task}
																	className="min-w-0"
																	taskTitleClassName="text-sm text-foreground"
																	showSize={true}
																	dash
																	taskNumberClassName="text-sm text-muted-foreground"
																/>
																<div className="flex items-center justify-between w-full">
																	<div className="flex flex-row items-center self-stretch flex-none grow-0 gap-2 py-0">
																		{task.project?.imageUrl && (
																			<ProjectLogo
																				className="size-5 rounded-sm object-cover hairline-ring ring-border"
																				imageUrl={task.project.imageUrl}
																			/>
																		)}
																		<span className="flex-1 truncate text-xs text-muted-foreground">
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
	const { handleSelectRowTimesheet, selectTimesheetId } = useTimesheetQuery({});

	return (
		<CalendarComponent
			t={t}
			data={data}
			// locale={ }
			daysLabels={daysLabels}
			renderDayContent={(_date, plan) => {
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
													className="border-b-0 px-1"
												>
													<AccordionTrigger
														type="button"
														className="flex w-full flex-row-reverse items-center justify-end gap-x-1.5 rounded-md px-1 py-1.5 text-muted-foreground transition-colors hover:bg-foreground/5 hover:no-underline"
													>
														<div className="flex w-full items-center justify-between gap-2">
															<div className="flex w-full items-center gap-2">
																<TimesheetStatusBadge
																	status={status}
																	className="px-1.5"
																>
																	<span>{timesheetStatusLabel(status)}</span>
																	<span className="tabular-nums">
																		({timesheetRows.length})
																	</span>
																</TimesheetStatusBadge>
															</div>
															<div className="flex items-center gap-1 text-xs">
																<Clock className="size-3 text-muted-foreground" />
																<TotalTimeDisplay
																	timesheetLog={timesheetRows}
																	className="tabular-nums text-foreground"
																/>
															</div>
														</div>
													</AccordionTrigger>
													<AccordionContent className="flex flex-col items-start flex-none grow-0 order-1 p-0 pb-1 overflow-auto gap-y-1.5">
														{timesheetRows.map((task) => (
															<div
																key={task.id}
																className={cn(
																	'group/item box-border flex flex-col items-start gap-2 w-[258px] rounded-r-md border-l-[3px] bg-foreground/3 p-2.5 flex-none order-1 self-stretch grow',
																	timesheetStatusAccentClass(status)
																)}
															>
																<div className="flex items-center justify-between w-full">
																	<div className="flex items-center gap-x-1">
																		<EmployeeAvatar
																			className="size-6 rounded-full object-cover hairline-ring ring-border"
																			imageUrl={
																				task.employee?.user.imageUrl ?? ''
																			}
																		/>
																		<span className="text-sm text-foreground">
																			{task.employee?.fullName}
																		</span>
																	</div>
																	<DisplayTimeForTimesheet timesheetLog={task} />
																</div>
																<TaskNameInfoDisplay
																	task={task.task}
																	className="min-w-0"
																	taskTitleClassName="truncate text-sm text-foreground"
																	showSize={false}
																	dash
																	taskNumberClassName="text-sm text-muted-foreground"
																/>
																<div className="flex items-center justify-between w-full">
																	<div className="flex flex-row items-center self-stretch flex-none grow-0 gap-2 py-0">
																		{task.project?.imageUrl && (
																			<ProjectLogo
																				className="size-5 rounded-sm object-cover hairline-ring ring-border"
																				imageUrl={task.project.imageUrl}
																			/>
																		)}
																		<span className="flex-1 truncate text-xs text-muted-foreground">
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
							<div className="text-muted-foreground text-xs flex items-center justify-center min-h-[150px] sm:w-[250px] md:w-[300px] lg:w-[350px] max-w-full gap-2">
								<CodeBlock className="size-4" />
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
				'group/edit invisible select-auto group-hover/item:visible group-focus-within/item:visible',
				selectTimesheetId.includes(timesheet) && 'visible'
			)}
			onCheckedChange={() => handleSelectRowTimesheet(timesheet)}
			checked={selectTimesheetId.includes(timesheet)}
		/>
	);
};
