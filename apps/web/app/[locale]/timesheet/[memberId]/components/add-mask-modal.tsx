/* eslint-disable @next/next/no-img-element */
import React, { useCallback, useMemo } from 'react';
import { TranslationHooks, useTranslations } from 'next-intl';
import {
	Item,
	ManageOrMemberComponent,
	getNestedValue
} from '@/core/components/features/manual-time/manage-member-component';
import { useOrganizationProjects, useOrganizationTeams, useTeamTasks, useTimelogFilterOptions } from '@/core/hooks';
import { TimeLogType, TimerSource } from '@/core/types/interfaces';
import { clsxm } from '@/app/utils';
import { Modal } from '@/core/components';
import { CustomSelect, TaskNameInfoDisplay } from '@/core/components/features';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/core/components/ui/accordion';
import { DatePickerFilter } from './timesheet-filter-date';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/core/components/ui/select';
import { useTimesheet } from '@/core/hooks/features/useTimesheet';
import { toUTC } from '@/app/helpers';
import { PlusIcon, ReloadIcon } from '@radix-ui/react-icons';
import { ToggleButton } from './edit-task-modal';

export interface IAddTaskModalProps {
	isOpen: boolean;
	closeModal: () => void;
}

interface Shift {
	startTime: string;
	endTime: string;
	totalHours: string;
	dateFrom: Date | string;
}

interface FormState {
	isBillable: boolean;
	notes: string;
	projectId: string;
	taskId: string;
	employeeId: string;
	shifts: {
		dateFrom: Date;
		startTime: string;
		endTime: string;
	}[];
}

export function AddTaskModal({ closeModal, isOpen }: IAddTaskModalProps) {
	const { tasks } = useTeamTasks();
	const { generateTimeOptions } = useTimelogFilterOptions();
	const { organizationProjects } = useOrganizationProjects();
	const { activeTeam } = useOrganizationTeams();
	const { createTimesheet, loadingCreateTimesheet } = useTimesheet({});

	const timeOptions = generateTimeOptions(5);
	const t = useTranslations();

	const [formState, setFormState] = React.useState({
		notes: '',
		isBillable: true,
		taskId: '',
		employeeId: '',
		projectId: '',
		shifts: [{ startTime: '', endTime: '', totalHours: '00:00h', dateFrom: new Date() }] as Shift[]
	});

	const updateFormState = useCallback((field: keyof typeof formState, value: any) => {
		setFormState((prevState) => ({
			...prevState,
			[field]: value
		}));
	}, []);

	const projectItemsLists = useMemo(
		() => ({
			Project: organizationProjects || []
		}),
		[organizationProjects]
	);

	const handleSelectedValuesChange = useCallback(
		(values: { [key: string]: Item | null }) => {
			if (!values.Project) return;
			updateFormState('projectId', values.Project.id);
		},
		[updateFormState]
	);

	const handleChange = useCallback(
		(field: string, selectedItem: Item | null) => {
			if (!selectedItem) return;
			updateFormState(field as keyof typeof formState, selectedItem.id);
		},
		[updateFormState]
	);

	const itemToString = useCallback(
		(item: Item | null, displayKey: string) => getNestedValue(item, displayKey) || '',
		[]
	);

	const itemToValue = useCallback((item: Item | null, valueKey: string) => getNestedValue(item, valueKey) || '', []);

	const selectedValues = useMemo(
		() => ({
			Project: null
		}),
		[]
	);

	const fields = useMemo(
		() => [
			{
				label: t('common.LINK_TO_PROJECT'),
				placeholder: t('common.SELECT_A_PROJECT'),
				isRequired: true,
				valueKey: 'id',
				displayKey: 'name',
				element: 'Project'
			}
		],
		[t]
	);

	const createUtcDate = (baseDate: Date, time: string): Date => {
		const [hours, minutes] = time.split(':').map(Number);
		return new Date(Date.UTC(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hours, minutes));
	};

	const handleAddTimesheet = async (formState: FormState) => {
		const payload = {
			isBillable: formState.isBillable,
			description: formState.notes,
			projectId: formState.projectId,
			logType: TimeLogType.MANUAL as any,
			source: TimerSource.BROWSER as any,
			taskId: formState.taskId,
			employeeId: formState.employeeId,
			organizationTeamId: null
		};
		try {
			if (!formState.shifts || formState.shifts.length === 0) {
				throw new Error('No shifts provided.');
			}
			await Promise.all(
				formState.shifts.map(async (shift) => {
					if (!shift.dateFrom || !shift.startTime || !shift.endTime) {
						throw new Error('Incomplete shift data.');
					}
					const baseDate = shift.dateFrom instanceof Date ? shift.dateFrom : new Date(shift.dateFrom);
					const start = createUtcDate(baseDate, shift.startTime);
					const end = createUtcDate(baseDate, shift.endTime);
					const startedAt = toUTC(start).toISOString();
					const stoppedAt = toUTC(end).toISOString();
					if (stoppedAt <= startedAt) {
						throw new Error('End time must be after start time.');
					}
					await createTimesheet({
						...payload,
						startedAt: start,
						stoppedAt: end,
						taskId: payload.taskId
					});
				})
			);
			closeModal();
		} catch (error) {
			console.error('Failed to create timesheet:', error);
		}
	};

	return (
		<Modal
			isOpen={isOpen}
			closeModal={closeModal}
			title={`+ ${t('common.ADD_TIME_ENTRY')}`}
			showCloseIcon
			className="bg-light--theme-light dark:bg-dark--theme-light p-5 rounded-xl w-full md:w-40 md:min-w-[32rem] justify-start h-[auto]"
			titleClass="font-bold flex justify-start w-full"
		>
			<div className="flex flex-col w-full gap-4 justify-start md:w-40 md:min-w-[30rem] p-4">
				<div className=" w-full mr-[4%]">
					<label className="block text-[#282048] dark:text-gray-400 font-medium mb-1">
						{t('sidebar.TASKS')}
						<span className="text-[#de5505e1] ml-1">*</span>
					</label>
					<CustomSelect
						onChange={(value) => {
							updateFormState('taskId', value);
						}}
						classNameGroup="h-[40vh]"
						ariaLabel="Task issues"
						className="w-full font-medium"
						options={tasks}
						renderOption={(option) => (
							<div className="flex items-center gap-x-2 overflow-y-auto">
								<TaskNameInfoDisplay
									task={option as any}
									className={clsxm(
										'rounded-sm h-auto !px-[0.3312rem] py-[0.2875rem] shadow-[0px_0px_15px_0px_#e2e8f0] dark:shadow-transparent'
									)}
									taskTitleClassName={clsxm('text-sm text-ellipsis overflow-hidden')}
									showSize={true}
									dash
									taskNumberClassName="text-sm"
								/>
							</div>
						)}
					/>
				</div>
				<div className="block text-[#282048] dark:text-gray-400 font-medium mb-1">
					<label className="block text-[#282048] dark:text-gray-400  mb-1 px-2">
						{t('manualTime.EMPLOYEE')}
						<span className="text-[#de5505e1] ml-1">*</span>:
					</label>
					<CustomSelect
						valueKey="employeeId"
						classNameGroup="max-h-[40vh] dark:!text-white "
						ariaLabel="Task issues"
						className="w-full font-medium dark:text-white"
						options={activeTeam?.members || []}
						onChange={(value) => {
							updateFormState('employeeId', value);
						}}
						renderOption={(option) => (
							<div className="flex items-center gap-x-2">
								<img
									className="h-6 w-6 rounded-full"
									src={option.employee.user.imageUrl}
									alt={option.employee.fullName}
								/>
								<span>{option.employee.fullName}</span>
							</div>
						)}
					/>
				</div>
				<div>
					<OptimizedAccordion
						setShifts={(e) => updateFormState('shifts', e)}
						shifts={formState.shifts}
						t={t}
						timeOptions={timeOptions}
					/>
				</div>

				<div className="w-full flex flex-col">
					<ManageOrMemberComponent
						classNameTitle="text-[#282048] dark:text-gray-400 font-medium mr-12 capitalize"
						fields={fields}
						itemsLists={projectItemsLists}
						selectedValues={selectedValues}
						onSelectedValuesChange={handleSelectedValuesChange}
						handleChange={handleChange}
						itemToString={itemToString}
						itemToValue={itemToValue}
					/>
				</div>
				<div className=" flex flex-col items-start w-full">
					<label className="text-[#282048] dark:text-gray-400 font-medium mr-12 capitalize">
						{t('pages.timesheet.BILLABLE.BILLABLE').toLowerCase()}
					</label>
					<div className="flex items-start gap-3">
						<ToggleButton
							isActive={formState.isBillable}
							onClick={() => updateFormState('isBillable', true)}
							label={t('pages.timesheet.BILLABLE.YES')}
						/>
						<ToggleButton
							isActive={!formState.isBillable}
							onClick={() => updateFormState('isBillable', false)}
							label={t('pages.timesheet.BILLABLE.NO')}
						/>
					</div>
				</div>

				<div className="w-full flex flex-col">
					<span className="text-[#282048] dark:text-gray-400 font-medium">{t('common.NOTES')}</span>
					<textarea
						value={formState.notes}
						onChange={(e) => updateFormState('notes', e.target.value)}
						placeholder="Insert notes here..."
						className={clsxm(
							'bg-transparent focus:border-transparent focus:ring-2 focus:ring-transparent',
							'placeholder-gray-300 placeholder:font-normal resize-none p-2 grow w-full',
							'border border-gray-200 dark:border-slate-600 dark:bg-dark--theme-light rounded-md h-36 bg-[#FBB6500D]',
							formState.notes.trim().length === 0 && 'border-red-500'
						)}
						maxLength={120}
						minLength={0}
						aria-label="Insert notes here"
						required
					/>
					<div className="text-sm text-[#282048] dark:text-gray-400 font-medium text-right">
						{formState.notes.length}/{120}
					</div>
				</div>
				<div className="flex items-center gap-x-2 justify-end w-full">
					<button
						type="button"
						onClick={closeModal}
						className={clsxm(
							'text-primary dark:text-primary-light h-[2.3rem] w-[5.5rem] border px-2 rounded-lg border-gray-300 dark:border-slate-600 font-normal dark:bg-dark--theme-light'
						)}
					>
						{t('common.CANCEL')}
					</button>
					<button
						disabled={loadingCreateTimesheet}
						onClick={() => handleAddTimesheet(formState as any)}
						type="submit"
						className={clsxm(
							'bg-primary dark:bg-primary-light h-[2.3rem] w-[5.5rem] justify-center font-normal flex items-center text-white px-2 rounded-lg'
						)}
					>
						{loadingCreateTimesheet && <ReloadIcon className="w-4 h-4 mr-2 animate-spin" />}
						{t('common.SAVE')}
					</button>
				</div>
			</div>
		</Modal>
	);
}
interface ShiftTimingSelectProps {
	label: string;
	timeOptions: string[];
	placeholder: string;
	className?: string;
	value?: string;
	onChange?: (value: string) => void;
}

const ShiftTimingSelect = ({ label, timeOptions, placeholder, className, onChange, value }: ShiftTimingSelectProps) => (
	<div className="flex items-center border border-gray-200 dark:border-gray-700 gap-2 rounded w-full">
		<button
			className={clsxm(
				'  border-r px-2 py-2 text-center flex items-center font-medium hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none',
				className
			)}
		>
			{label}
		</button>
		<Select onValueChange={onChange} value={value}>
			<SelectTrigger className="w-full text-ellipsis border-transparent rounded-none bg-white dark:bg-dark--theme-light focus:ring-2 focus:ring-transparent">
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent className="z-[10000] max-h-60 overflow-y-auto">
				<SelectGroup>
					{timeOptions.map((time) => (
						<SelectItem
							key={time}
							value={time}
							className="hover:bg-primary focus:bg-primary hover:!text-white  py-1 cursor-pointer"
						>
							{time}
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	</div>
);

const OptimizedAccordion = ({
	setShifts,
	shifts,
	timeOptions,
	t
}: {
	shifts: Shift[];
	setShifts: React.Dispatch<React.SetStateAction<Shift[]>>;
	timeOptions: string[];
	t: TranslationHooks;
}) => {
	const convertToMinutesHour = (time: string): number => {
		const [hourMinute, period] = time.split(' ');
		const [hours, minutes] = hourMinute.split(':').map(Number);

		let totalMinutes = (hours % 12) * 60 + minutes;
		if (period === 'PM') totalMinutes += 720;

		return totalMinutes;
	};

	const calculateTotalHoursHour = React.useCallback((start: string, end: string): string => {
		if (!start || !end) return '00:00h';
		const startMinutes = convertToMinutesHour(start);
		const endMinutes = convertToMinutesHour(end);
		const totalMinutes = endMinutes >= startMinutes ? endMinutes - startMinutes : 1440 - startMinutes + endMinutes;
		const hours = Math.floor(totalMinutes / 60);
		const minutes = totalMinutes % 60;
		return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}h`;
	}, []);

	const handleAddShift = () => {
		setShifts([...shifts, { startTime: '', endTime: '', totalHours: '00:00:00 h', dateFrom: new Date() }]);
	};

	const handleRemoveShift = (index: number) => {
		const updatedShifts = shifts.filter((_, i) => i !== index);
		setShifts(updatedShifts);
	};

	const handleShiftChange = (index: number, field: keyof Shift, value: string) => {
		const updatedShifts = [...shifts];
		updatedShifts[index][field] = value;

		if (field === 'startTime' || field === 'endTime') {
			const { startTime, endTime } = updatedShifts[index];

			if (!startTime || !endTime) return;

			if (convertToMinutesHour(startTime) >= convertToMinutesHour(endTime)) {
				return;
			}
			updatedShifts[index].totalHours = calculateTotalHoursHour(startTime, endTime);
			const isOverlapping = shifts.some((shift, i) => {
				if (i === index || !shift.startTime || !shift.endTime) return false;

				const currentStart = convertToMinutesHour(startTime);
				const currentEnd = convertToMinutesHour(endTime);
				const shiftStart = convertToMinutesHour(shift.startTime);
				const shiftEnd = convertToMinutesHour(shift.endTime);
				return (
					(currentStart < shiftEnd && currentEnd > shiftStart) ||
					(currentStart === shiftStart && currentEnd === shiftEnd)
				);
			});

			if (isOverlapping) {
				return;
			}
		}

		setShifts(updatedShifts);
	};

	return (
		<>
			{shifts.map((element, index) => {
				return (
					<Accordion key={index} type="single" collapsible className="w-full p-1">
						<AccordionItem value={`item-${index}`} className="border rounded">
							<AccordionTrigger className="flex flex-row-reverse justify-end h-10 p-1 items-center hover:no-underline">
								<div className="flex items-center justify-between w-full">
									<label className="block text-[#282048] dark:text-gray-400 mb-1 px-2">
										{t('common.DATE_AND_TIME')}
										<span className="text-[#de5505e1] ml-1">*</span>:
									</label>
									<span
										onClick={() => handleRemoveShift(index)}
										className="hover:underline font-normal text-primary dark:text-primary-light cursor-pointer"
									>
										{t('common.REMOVE_PERIOD')}
									</span>
								</div>
							</AccordionTrigger>
							<AccordionContent className="p-2">
								<div className="flex flex-col gap-2">
									<ShiftManagement
										t={t}
										value={element}
										index={index}
										onChange={handleShiftChange}
										timeOptions={timeOptions}
									/>
								</div>
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				);
			})}
			<button onClick={handleAddShift} className="flex items-center justify-start gap-2 cursor-pointer">
				<div className="bg-[#3826A6] dark:bg-primary-light p-[0.5] rounded text-white">
					<PlusIcon />
				</div>
				<span className="text-[#3826A6] dark:text-primary-light hover:underline">
					{t('common.ADD_ANOTHER_PERIOD')}
				</span>
			</button>
		</>
	);
};

const ShiftManagement = ({
	onChange,
	value,
	index,
	timeOptions,
	t
}: {
	onChange: (index: number, field: keyof Shift, value: string) => void;
	value: Shift;
	index: number;
	timeOptions: string[];
	t: TranslationHooks;
}) => {
	return (
		<>
			<div className="w-[212px]">
				<span>{t('manualTime.DATE')}</span>
				<DatePickerFilter
					label={value.dateFrom ? value.dateFrom.toLocaleString() : t('common.SELECT_DATE')}
					date={value.dateFrom as Date}
					setDate={(value) => onChange(index, 'dateFrom', value as any)}
				/>
			</div>
			<div className="flex flex-col w-full items-start gap-2">
				<span className="font-medium">{t('common.SHIFT_TIMING')}</span>
				<div className="flex items-center w-full justify-between gap-4 mb-4">
					<ShiftTimingSelect
						label="Start"
						timeOptions={timeOptions}
						placeholder="00:00:00"
						className="bg-[#30B3661A]"
						value={value.startTime}
						onChange={(value) => onChange(index, 'startTime', value)}
					/>
					<ShiftTimingSelect
						label="End"
						timeOptions={timeOptions}
						placeholder="00:00:00"
						className="bg-[#DA27271A]"
						value={value.endTime}
						onChange={(value) => onChange(index, 'endTime', value)}
					/>
					<button className="bg-gray-100 dark:bg-gray-800 border-r px-2 py-2 text-center flex items-center font-medium hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none">
						{value.totalHours}
					</button>
				</div>
			</div>
		</>
	);
};
