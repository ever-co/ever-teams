import { TimesheetLog, TimesheetStatus } from '@/core/types/interfaces/to-review';
import { Modal, statusColor } from '@/core/components';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import { TimesheetCardDetail } from './timesheet-card';
import { TranslationHooks, useTranslations } from 'next-intl';
import { TimesheetDetailMode } from '../../../../app/[locale]/(main)/timesheet/[memberId]/page';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/core/components/common/accordion';
import { cn } from '@/core/lib/helpers';
import { useTimesheet } from '@/core/hooks/activities/use-timesheet';
import { Badge } from '@/core/components/common/badge';
import { EmployeeAvatar, ProjectLogo } from '../../timesheet/compact-timesheet-component';
import { groupBy } from '@/core/lib/helpers/array-data';
import { TaskNameInfoDisplay, TotalTimeDisplay } from '../../tasks/task-displays';

export interface IAddTaskModalProps {
	isOpen: boolean;
	closeModal: () => void;
	timesheet?: Record<TimesheetStatus, TimesheetLog[]>;
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
			className="bg-light--theme-light dark:bg-dark--theme-light p-5 rounded w-full md:w-40 md:min-w-[35rem]"
			titleClass="font-bold flex justify-start w-full text-xl dark:text-white"
		>
			<div className="w-full py-4">
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

const MembersWorkedCard = ({ element, t }: { element: TimesheetLog[]; t: TranslationHooks }) => {
	const memberWork = groupBy(element, (items) => items.employeeId);
	const memberWorkItems = Object.entries(memberWork)
		.map(([employeeId, element]) => ({ employeeId, element }))
		.sort((a, b) => b.employeeId.localeCompare(a.employeeId));

	const { getStatusTimesheet } = useTimesheet({});

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
						<AccordionItem value={timesheet.employeeId} className="p-1 rounded">
							<AccordionTrigger
								type="button"
								className={cn(
									'flex flex-row-reverse gap-x-2 justify-end items-center px-2 w-full rounded-sm h-[50px] hover:no-underline'
								)}
							>
								<div className="flex items-center justify-between w-full">
									<div className="flex items-center gap-2">
										<EmployeeAvatar
											className="w-10 h-10 border rounded-full shadow-md"
											imageUrl={timesheet.element[0].employee.user?.imageUrl ?? ''}
										/>
										<span className="font-bold">{timesheet.element[0].employee.fullName}</span>
									</div>
									<Badge
										variant={'outline'}
										className="box-border flex flex-row items-center px-2 py-1 gap-2 w-[108px] h-[30px] bg-[rgba(247,247,247,0.6)] border border-gray-300 rounded-lg flex-none order-1 flex-grow-0"
									>
										<span className="text-[#5f5f61] text-[14px] font-[700px]">
											{t('timer.TOTAL_HOURS').split(' ')[0]}:
										</span>
										<TotalTimeDisplay
											timesheetLog={timesheet.element}
											className="text-[#293241] text-[14px]"
										/>
									</Badge>
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
													className="p-1 rounded"
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
																	className={cn(
																		'p-2 rounded',
																		statusColor(status).bg
																	)}
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
																	<span className="text-[#5f5f61] text-[14px] font-[700px]">
																		{t('timer.TOTAL_HOURS').split(' ')[0]}:
																	</span>
																	<TotalTimeDisplay
																		timesheetLog={rows}
																		className="text-[#293241] text-[14px]"
																	/>
																</Badge>
															</div>
														</div>
													</AccordionTrigger>
													<AccordionContent className="w-full">
														{rows.map((items) => (
															<div
																key={items.id}
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
																		task={items.task}
																		className={cn(
																			'rounded-sm h-auto !px-[0.3312rem] py-[0.2875rem] shadow-[0px_0px_15px_0px_#e2e8f0] dark:shadow-transparent'
																		)}
																		taskTitleClassName={cn(
																			'text-sm text-ellipsis overflow-hidden '
																		)}
																		showSize={false}
																		dash
																		taskNumberClassName="text-sm"
																	/>
																</div>
																<div className="flex items-center flex-1 gap-2">
																	{items.project?.imageUrl && (
																		<ProjectLogo
																			className="w-[28px] h-[28px] drop-shadow-[25%] rounded-[8px]"
																			imageUrl={items.project.imageUrl}
																		/>
																	)}
																	<span className="font-medium">
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
	element: TimesheetLog[];
	t: TranslationHooks;
}

/**
 * @param {MenHoursCardProps} props - the component props
 * @returns {JSX.Element} - the rendered component
 */
const MenHoursCard = ({ element, t }: MenHoursCardProps) => {
	const menHours = groupBy(element, (items) => items.timesheet.status);
	const menHoursItems = Object.entries(menHours)
		.map(([status, element]) => ({ status, element }))
		.sort((a, b) => b.status.localeCompare(a.status));

	const { getStatusTimesheet } = useTimesheet({});

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
						<AccordionItem value={timesheet.status} className="p-1 rounded">
							<AccordionTrigger
								style={{
									backgroundColor: statusColor(timesheet.element[0].timesheet.status).bgOpacity
								}}
								type="button"
								className={cn(
									'flex flex-row-reverse gap-x-2 justify-end items-center px-2 w-full rounded-sm h-[50px] hover:no-underline'
								)}
							>
								<div className="flex items-center justify-between w-full">
									<div className="flex items-center gap-2">
										<div
											className={cn(
												'p-2 rounded-[3px] gap-2 w-[20px] h-[20px]',
												statusColor(timesheet.element[0].timesheet.status).bg
											)}
										></div>
										<span className="font-bold">
											{timesheet.element[0].timesheet.status === 'DENIED'
												? 'REJECTED'
												: timesheet.element[0].timesheet.status}
										</span>
									</div>
									<Badge
										variant={'outline'}
										className="box-border flex flex-row items-center px-2 py-1 gap-2 w-[108px] h-[30px] bg-[rgba(247,247,247,0.6)] border border-gray-300 rounded-lg flex-none order-1 flex-grow-0"
									>
										<span className="text-[#5f5f61] text-[14px] font-[700px]">
											{t('timer.TOTAL_HOURS').split(' ')[0]}:
										</span>
										<TotalTimeDisplay
											timesheetLog={timesheet.element}
											className="text-[#293241] text-[14px]"
										/>
									</Badge>
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
													className="p-1 rounded"
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
																	className={cn(
																		'p-2 rounded',
																		statusColor(status).bg
																	)}
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
																	<span className="text-[#5f5f61] text-[14px] font-[700px]">
																		{t('timer.TOTAL_HOURS').split(' ')[0]}:
																	</span>
																	<TotalTimeDisplay
																		timesheetLog={rows}
																		className="text-[#293241] text-[14px]"
																	/>
																</Badge>
															</div>
														</div>
													</AccordionTrigger>
													<AccordionContent className="w-full">
														{rows.map((items) => (
															<div
																key={items.id}
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
																		task={items.task}
																		className={cn(
																			'rounded-sm h-auto !px-[0.3312rem] py-[0.2875rem] shadow-[0px_0px_15px_0px_#e2e8f0] dark:shadow-transparent'
																		)}
																		taskTitleClassName={cn(
																			'text-sm !text-ellipsis !overflow-hidden '
																		)}
																		showSize={false}
																		dash
																		taskNumberClassName="text-sm"
																	/>
																</div>
																<div className="flex items-center flex-1 gap-2">
																	{items.project?.imageUrl && (
																		<ProjectLogo
																			className="w-[28px] h-[28px] drop-shadow-[25%] rounded-[8px]"
																			imageUrl={items.project.imageUrl}
																		/>
																	)}
																	<span className="font-medium">
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
