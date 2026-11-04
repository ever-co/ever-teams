import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import { Modal } from '@/core/components';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import { TimesheetCardDetail } from './timesheet-card';
import { TranslationHooks, useTranslations } from 'next-intl';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/core/components/common/accordion';
import { cn } from '@/core/lib/helpers';
import { getStatusTimesheet } from '@/core/lib/helpers/timesheet-grouping';
import { EmployeeAvatar, ProjectLogo } from '../../timesheet/compact-timesheet-component';
import { groupBy } from '@/core/lib/helpers/array-data';
import { TaskNameInfoDisplay, TotalTimeDisplay } from '../../tasks/task-displays';
import { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { TimesheetDetailMode } from './timesheet-page-content';
import { TimesheetStatusBadge, TimesheetTotalBadge } from '../../timesheet/timesheet-status-badge';
import { timesheetStatusLabel } from '../../timesheet/timesheet-status-tone';

export interface IAddTaskModalProps {
	isOpen: boolean;
	closeModal: () => void;
	timesheet?: Record<ETimesheetStatus, ITimeLog[]>;
	timesheetDetailMode?: TimesheetDetailMode;
}

function TimesheetDetailModal({ closeModal, isOpen, timesheet, timesheetDetailMode }: IAddTaskModalProps) {
	const t = useTranslations();

	const titles = {
		Pending: 'View Pending Details',
		MemberWork: 'View Member Work Details'
	};
	const title = titles[timesheetDetailMode as 'Pending' | 'MemberWork'] || 'View Men Hours Details';
	const timesheetDetail = Object.values(timesheet ?? {}).flat();

	return (
		<Modal
			isOpen={isOpen}
			closeModal={closeModal}
			title={title}
			showCloseIcon
			className="w-full md:w-40 md:min-w-[35rem]"
			titleClass="flex justify-start w-full"
		>
			<div className="w-full">
				<div className="flex flex-col  w-full  gap-4  h-[60vh] max-h-[60vh]  overflow-y-auto ">
					{(() => {
						switch (timesheetDetailMode) {
							case 'Pending':
								return timesheet?.PENDING.length === 0 ? (
									<AnimatedEmptyState
										title={t('pages.timesheet.NO_ENTRIES_FOUND')}
										message={t('common.SELECT_DIFFERENT_DATE')}
										showBorder={true}
										noBg
										iconContainerSize="md"
										iconSize="sm"
									/>
								) : (
									<TimesheetCardDetail data={timesheet} />
								);
							case 'MemberWork':
								return <MembersWorkedCard element={timesheetDetail} t={t} />;
							case 'MenHours':
								return <MenHoursCard element={timesheetDetail} t={t} />;
							default:
								return null;
						}
					})()}
				</div>
			</div>
		</Modal>
	);
}
export default TimesheetDetailModal;

const MembersWorkedCard = ({ element, t }: { element: ITimeLog[]; t: TranslationHooks }) => {
	const memberWork = groupBy(element, (items) => items.employeeId || '');
	const memberWorkItems = Object.entries(memberWork)
		.map(([employeeId, element]) => ({ employeeId, element }))
		.sort((a, b) => b.employeeId.localeCompare(a.employeeId));

	// getStatusTimesheet imported as a pure function from timesheet-grouping

	if (memberWorkItems.length === 0) {
		return (
			<AnimatedEmptyState
				title={t('pages.timesheet.NO_ENTRIES_FOUND')}
				message={t('common.SELECT_DIFFERENT_DATE')}
				showBorder={true}
				noBg
				iconContainerSize="md"
				iconSize="sm"
			/>
		);
	}

	return (
		<div>
			{memberWorkItems.map((timesheet, index) => {
				return (
					<Accordion key={index} type="single" collapsible>
						<AccordionItem value={timesheet.employeeId} className="border-border">
							<AccordionTrigger
								type="button"
								className={cn(
									'flex h-14 w-full flex-row-reverse items-center justify-end gap-x-2 rounded-md px-2 py-0',
									'transition-colors hover:bg-foreground/2.5 hover:no-underline'
								)}
							>
								<div className="flex justify-between items-center gap-3 w-full">
									<div className="flex gap-2 items-center min-w-0">
										<EmployeeAvatar
											className="size-8 rounded-full object-cover hairline-ring ring-border"
											imageUrl={timesheet.element[0].employee?.user?.imageUrl ?? ''}
										/>
										<span className="truncate text-sm font-medium text-foreground">
											{timesheet.element[0].employee?.fullName}
										</span>
									</div>
									<TimesheetTotalBadge label={<>{t('timer.TOTAL_HOURS').split(' ')[0]}:</>}>
										<TotalTimeDisplay
											timesheetLog={timesheet.element}
											className="text-foreground"
										/>
									</TimesheetTotalBadge>
								</div>
							</AccordionTrigger>
							<AccordionContent className="w-full">
								<Accordion key={index} type="single" collapsible>
									{Object.entries(getStatusTimesheet(timesheet.element)).map(([status, rows]) => {
										return (
											rows.length > 0 &&
											status && (
												<AccordionItem
													key={status}
													value={status === 'DENIED' ? 'REJECTED' : status}
													className="border-b-0 pl-4"
												>
													<AccordionTrigger
														type="button"
														className={cn(
															'flex h-11 w-full flex-row-reverse items-center justify-end gap-x-2 rounded-md px-2 py-0',
															'text-muted-foreground transition-colors hover:bg-foreground/2.5 hover:no-underline'
														)}
													>
														<div className="flex justify-between items-center gap-3 w-full">
															<div className="flex items-center gap-2">
																<TimesheetStatusBadge status={status}>
																	<span>{timesheetStatusLabel(status)}</span>
																	<span className="tabular-nums">
																		({rows.length})
																	</span>
																</TimesheetStatusBadge>
																<TimesheetTotalBadge
																	label={<>{t('timer.TOTAL_HOURS').split(' ')[0]}:</>}
																>
																	<TotalTimeDisplay
																		timesheetLog={rows}
																		className="text-foreground"
																	/>
																</TimesheetTotalBadge>
															</div>
														</div>
													</AccordionTrigger>
													<AccordionContent className="w-full pb-2">
														{rows.map((items) => (
															<div
																key={items.id}
																className={cn(
																	'flex min-h-12 items-center gap-4 hairline-t border-border px-2 py-2',
																	'transition-colors hover:bg-foreground/2.5'
																)}
															>
																<div className="min-w-0 flex-2">
																	<TaskNameInfoDisplay
																		task={items.task}
																		className="min-w-0"
																		taskTitleClassName="text-sm text-foreground"
																		showSize={false}
																		dash
																		taskNumberClassName="text-sm text-muted-foreground"
																	/>
																</div>
																<div className="flex flex-1 gap-2 items-center min-w-0">
																	{items.project?.imageUrl && (
																		<ProjectLogo
																			className="size-6 rounded-md object-cover hairline-ring ring-border"
																			imageUrl={items.project.imageUrl}
																		/>
																	)}
																	<span className="truncate text-sm">
																		{items.project?.name}
																	</span>
																</div>
															</div>
														))}
													</AccordionContent>
												</AccordionItem>
											)
										);
									})}
								</Accordion>
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				);
			})}
		</div>
	);
};

interface MenHoursCardProps {
	element: ITimeLog[];
	t: TranslationHooks;
}

/**
 * @param {MenHoursCardProps} props - the component props
 * @returns {JSX.Element} - the rendered component
 */
const MenHoursCard = ({ element, t }: MenHoursCardProps) => {
	const menHours = groupBy(element, (items) => items.timesheet?.status || '');
	const menHoursItems = Object.entries(menHours)
		.map(([status, element]) => ({ status, element }))
		.sort((a, b) => b.status.localeCompare(a.status));

	// getStatusTimesheet imported as a pure function from timesheet-grouping

	if (menHoursItems.length === 0) {
		return (
			<AnimatedEmptyState
				title={t('pages.timesheet.NO_ENTRIES_FOUND')}
				message={t('common.SELECT_DIFFERENT_DATE')}
				showBorder={true}
				noBg
				iconContainerSize="md"
				iconSize="sm"
			/>
		);
	}

	return (
		<div>
			{menHoursItems.map((timesheet, index) => {
				return (
					<Accordion key={index} type="single" collapsible>
						<AccordionItem value={timesheet.status} className="border-border">
							<AccordionTrigger
								type="button"
								className={cn(
									'flex h-12 w-full flex-row-reverse items-center justify-end gap-x-2 rounded-md px-2 py-0',
									'transition-colors hover:bg-foreground/2.5 hover:no-underline'
								)}
							>
								<div className="flex justify-between items-center gap-3 w-full">
									<div className="flex gap-2 items-center">
										<TimesheetStatusBadge status={timesheet.element[0].timesheet?.status}>
											<span>{timesheetStatusLabel(timesheet.element[0].timesheet?.status)}</span>
										</TimesheetStatusBadge>
									</div>
									<TimesheetTotalBadge label={<>{t('timer.TOTAL_HOURS').split(' ')[0]}:</>}>
										<TotalTimeDisplay
											timesheetLog={timesheet.element}
											className="text-foreground"
										/>
									</TimesheetTotalBadge>
								</div>
							</AccordionTrigger>
							<AccordionContent className="w-full">
								<Accordion key={index} type="single" collapsible>
									{Object.entries(getStatusTimesheet(timesheet.element)).map(([status, rows]) => {
										return (
											rows.length > 0 &&
											status && (
												<AccordionItem
													key={status}
													value={status === 'DENIED' ? 'REJECTED' : status}
													className="border-b-0 pl-4"
												>
													<AccordionTrigger
														type="button"
														className={cn(
															'flex h-11 w-full flex-row-reverse items-center justify-end gap-x-2 rounded-md px-2 py-0',
															'text-muted-foreground transition-colors hover:bg-foreground/2.5 hover:no-underline'
														)}
													>
														<div className="flex justify-between items-center gap-3 w-full">
															<div className="flex items-center gap-2">
																<TimesheetStatusBadge status={status}>
																	<span>{timesheetStatusLabel(status)}</span>
																	<span className="tabular-nums">
																		({rows.length})
																	</span>
																</TimesheetStatusBadge>
																<TimesheetTotalBadge
																	label={<>{t('timer.TOTAL_HOURS').split(' ')[0]}:</>}
																>
																	<TotalTimeDisplay
																		timesheetLog={rows}
																		className="text-foreground"
																	/>
																</TimesheetTotalBadge>
															</div>
														</div>
													</AccordionTrigger>
													<AccordionContent className="w-full pb-2">
														{rows.map((items) => (
															<div
																key={items.id}
																className={cn(
																	'flex min-h-12 items-center gap-4 hairline-t border-border px-2 py-2',
																	'transition-colors hover:bg-foreground/2.5'
																)}
															>
																<div className="min-w-0 flex-2">
																	<TaskNameInfoDisplay
																		task={items.task}
																		className="min-w-0"
																		taskTitleClassName="text-sm text-foreground"
																		showSize={false}
																		dash
																		taskNumberClassName="text-sm text-muted-foreground"
																	/>
																</div>
																<div className="flex flex-1 gap-2 items-center min-w-0">
																	{items.project?.imageUrl && (
																		<ProjectLogo
																			className="size-6 rounded-md object-cover hairline-ring ring-border"
																			imageUrl={items.project.imageUrl}
																		/>
																	)}
																	<span className="truncate text-sm">
																		{items.project?.name}
																	</span>
																</div>
															</div>
														))}
													</AccordionContent>
												</AccordionItem>
											)
										);
									})}
								</Accordion>
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				);
			})}
		</div>
	);
};
