import React, { useCallback, useMemo } from 'react';
import { TranslationHooks, useTranslations } from 'next-intl';
import { Item, ManageOrMemberComponent, getNestedValue } from '@/core/components/teams/manage-member-component';
import { useTimelogFilterOptions } from '@/core/hooks';
import { clsxm } from '@/core/lib/utils';
import { Modal } from '@/core/components';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/core/components/common/accordion';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/core/components/common/select';
import { useCreateTimesheet } from '@/core/hooks/timesheet/use-create-timesheet';
import { toUTC } from '@/core/lib/helpers/index';
import {
	ADD_TIME_ENTRY_STEP_MINUTES,
	type CheckTimeEntrySave,
	periodLengthOf,
	timeChoiceOf,
	type TimeEntryCopy
} from '@/core/lib/utils/time-entry-reuse';
import { CircleAlert, Plus, Spinner } from '@/core/components/icons';
import { Button } from '@/core/components/duplicated-components/_button';
import { controlGroupRecipe, controlRecipe } from '@/core/components/common/input';
import { CustomSelect } from '../../common/multiple-select';
import { TaskNameInfoDisplay } from '../../tasks/task-displays';
import { ToggleButton } from '../tasks/edit-task-modal';
import { DatePickerFilter } from '../../pages/timesheet/timesheet-filter-date';
import { ETimeLogType, ETimeLogSource } from '@/core/types/generics/enums/timer';
import { useAtomValue } from 'jotai';
import { activeTeamState, tasksByTeamState } from '@/core/stores';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import type { TOrganizationProject } from '@/core/types/schemas/organization/organization-project.schema';
import type { TOrganizationTeamEmployee } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';

export interface IAddTaskModalProps {
	isOpen: boolean;
	closeModal: () => void;
	/** A copied entry the dialog opens filled with; an empty form when not given. */
	prefill?: TimeEntryCopy;
	/** Asked before the periods are saved: a returned message refuses the save and is shown in the dialog. */
	checkBeforeSave?: CheckTimeEntrySave;
}

interface Shift {
	startTime: string;
	endTime: string;
	totalHours: string;
	dateFrom: Date | string;
}

interface FormState {
	billableChoice: boolean | null;
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

/** Minutes since midnight for a time option such as "01:30:00 PM". */
const convertToMinutesHour = (time: string): number => {
	const [hourMinute, period] = time.split(' ');
	const [hours, minutes] = hourMinute.split(':').map(Number);

	let totalMinutes = (hours % 12) * 60 + minutes;
	if (period === 'PM') totalMinutes += 720;

	return totalMinutes;
};

/**
 * Builds the Date for a picked time on the given day. The picked times are the user's wall-clock
 * times; the Date is serialized to UTC when sent.
 * Returns null when that time does not exist on the day (skipped by a daylight saving change),
 * because the local constructor would silently move it forward.
 */
const createLocalDate = (baseDate: Date, time: string): Date | null => {
	const minutesOfDay = convertToMinutesHour(time);
	const date = new Date(
		baseDate.getFullYear(),
		baseDate.getMonth(),
		baseDate.getDate(),
		Math.floor(minutesOfDay / 60),
		minutesOfDay % 60
	);
	return date.getHours() * 60 + date.getMinutes() === minutesOfDay ? date : null;
};

/**
 * Clears the times of a shift that do not exist on its new day (daylight saving change),
 * so they are picked again instead of being saved as something else.
 */
const clearSkippedTimes = (shift: Shift, day: Date) => {
	const clearStart = !!shift.startTime && !createLocalDate(day, shift.startTime);
	const clearEnd = !!shift.endTime && !createLocalDate(day, shift.endTime);
	if (clearStart) shift.startTime = '';
	if (clearEnd) shift.endTime = '';
	if (clearStart || clearEnd) shift.totalHours = '00:00h';
};

function findProject(projectId: string | null | undefined, projects: TOrganizationProject[]) {
	if (!projectId) {
		return undefined;
	}
	return projects.find((project) => project.id === projectId);
}

/** The project of an entry on this task: the task's own project as it is now, or else the one picked by hand. */
function entryProjectIdOf(task: { projectId?: string | null } | undefined, pickedProjectId: string): string {
	const taskProjectId = task?.projectId;
	if (taskProjectId) {
		return taskProjectId;
	}
	return pickedProjectId;
}

/** The billable value picked by hand, or else the entry's project's own setting. */
function billableOf(billableChoice: boolean | null, project: TOrganizationProject | null): boolean {
	if (billableChoice !== null) {
		return billableChoice;
	}
	return project?.billable === true;
}

/**
 * A task's time goes to the task's own project: when the task has one, it is the only project offered. A task
 * project missing from the list (archived, or not loaded yet) offers none, since another pick would not be saved.
 */
function projectChoicesFor(
	taskProjectId: string | null | undefined,
	taskProject: TOrganizationProject | undefined,
	projects: TOrganizationProject[]
) {
	if (!taskProjectId) {
		return projects;
	}
	if (taskProject) {
		return [taskProject];
	}
	return [];
}

const NOTES_MAX_LENGTH = 120;

const MILLISECONDS_PER_SECOND = 1000;

interface CopiedForm {
	notes: string;
	billableChoice: boolean | null;
	taskId: string;
	employeeId: string;
	projectId: string;
	shifts: Shift[];
}

function offeredIdOf(id: string, isOffered: boolean) {
	if (isOffered) {
		return id;
	}
	return '';
}

/**
 * The form of a copied entry, on the interval the copy was placed at. Its task and its employee are taken only when
 * the dialog's lists offer them: an id the form cannot show would be saved without the person seeing it.
 */
function copiedFormOf(
	copy: TimeEntryCopy | undefined,
	tasks: TTask[],
	members: TOrganizationTeamEmployee[] | null | undefined
): Partial<CopiedForm> {
	if (!copy) {
		return {};
	}
	const isTaskOffered = tasks.some((task) => task.id === copy.taskId);
	const teamMembers = members ?? [];
	const isEmployeeOffered = teamMembers.some((member) => member.employeeId === copy.employeeId);
	const milliseconds = copy.end.getTime() - copy.start.getTime();
	const seconds = milliseconds / MILLISECONDS_PER_SECOND;
	const period: Shift = {
		startTime: timeChoiceOf(copy.start),
		endTime: timeChoiceOf(copy.end),
		totalHours: periodLengthOf(seconds),
		dateFrom: copy.start
	};
	return {
		notes: copy.description.slice(0, NOTES_MAX_LENGTH),
		billableChoice: copy.isBillable,
		taskId: offeredIdOf(copy.taskId, isTaskOffered),
		employeeId: offeredIdOf(copy.employeeId, isEmployeeOffered),
		projectId: copy.projectId,
		shifts: [period]
	};
}

export function AddTaskModal({ closeModal, isOpen, prefill, checkBeforeSave }: IAddTaskModalProps) {
	const tasks = useAtomValue(tasksByTeamState);
	const { generateTimeOptions } = useTimelogFilterOptions();
	const { organizationProjects, getOrganizationProjectsLoading } = useOrganizationProjectsQuery();

	const activeTeam = useAtomValue(activeTeamState);
	const { createTimesheet, loadingCreateTimesheet } = useCreateTimesheet();

	const timeOptions = generateTimeOptions(ADD_TIME_ENTRY_STEP_MINUTES);
	const t = useTranslations();

	const [formState, setFormState] = React.useState(() => ({
		notes: '',
		billableChoice: null as boolean | null,
		taskId: '',
		employeeId: '',
		projectId: '',
		shifts: [{ startTime: '', endTime: '', totalHours: '00:00h', dateFrom: new Date() }] as Shift[],
		...copiedFormOf(prefill, tasks, activeTeam?.members)
	}));
	const [saveRefusal, setSaveRefusal] = React.useState('');
	const [isCheckingSave, setIsCheckingSave] = React.useState(false);

	// The task and the employee come from the active team's lists: when that team changes under the open form
	// (a team switch from another tab), they are cleared instead of being saved with the new team
	const activeTeamId = activeTeam?.id;
	const [formTeamId, setFormTeamId] = React.useState(activeTeamId);
	if (formTeamId !== activeTeamId) {
		setFormTeamId(activeTeamId);
		setFormState((prevState) => ({ ...prevState, taskId: '', employeeId: '' }));
	}

	// The required task and employee: Save stays disabled until both are picked
	const hasTaskAndEmployee = Boolean(formState.taskId) && Boolean(formState.employeeId);

	const updateFormState = useCallback((field: keyof typeof formState, value: any) => {
		setFormState((prevState) => ({
			...prevState,
			[field]: value
		}));
	}, []);

	const projects = useMemo(() => organizationProjects || [], [organizationProjects]);
	const selectedTask = tasks.find((task) => task.id === formState.taskId);
	const taskProject = findProject(selectedTask?.projectId, projects);
	const entryProjectId = entryProjectIdOf(selectedTask, formState.projectId);
	const selectedProject = findProject(entryProjectId, projects) ?? null;
	const isBillable = billableOf(formState.billableChoice, selectedProject);
	// Its billable default is unknown until the entry's project has loaded
	const hasUnloadedProject = Boolean(entryProjectId) && !selectedProject;
	const waitsForProject = hasUnloadedProject && getOrganizationProjectsLoading;
	const isSaveDisabled = loadingCreateTimesheet || waitsForProject || isCheckingSave;

	const pickTask = useCallback(
		(taskId: string) => {
			const pickedTask = tasks.find((task) => task.id === taskId);
			const pickedTaskProjectId = pickedTask?.projectId;
			if (!pickedTaskProjectId) {
				// Keep the project shown so far, which follows the previous task if it moved meanwhile
				setFormState((prevState) => {
					const previousTask = tasks.find((task) => task.id === prevState.taskId);
					const shownProjectId = entryProjectIdOf(previousTask, prevState.projectId);
					return { ...prevState, taskId, projectId: shownProjectId, billableChoice: null };
				});
				return;
			}
			setFormState((prevState) => ({
				...prevState,
				taskId,
				projectId: pickedTaskProjectId,
				billableChoice: null
			}));
		},
		[tasks]
	);

	const selectedTaskProjectId = selectedTask?.projectId;
	const projectItemsLists = useMemo(
		() => ({
			Project: projectChoicesFor(selectedTaskProjectId, taskProject, projects)
		}),
		[projects, selectedTaskProjectId, taskProject]
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
			Project: selectedProject
		}),
		[selectedProject]
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

	const refusalOf = async (check: CheckTimeEntrySave, employeeId: string, periods: { start: Date; end: Date }[]) => {
		setIsCheckingSave(true);
		try {
			return await check({ employeeId, periods });
		} finally {
			setIsCheckingSave(false);
		}
	};

	const handleAddTimesheet = async (formState: FormState) => {
		const payload = {
			isBillable,
			description: formState.notes,
			projectId: entryProjectId,
			logType: ETimeLogType.MANUAL as any,
			source: ETimeLogSource.TEAMS as any,
			taskId: formState.taskId,
			employeeId: formState.employeeId,
			organizationTeamId: activeTeam?.id
		};
		try {
			// Both are required (the form marks them): one cleared by a team switch must be picked again first
			if (!formState.taskId || !formState.employeeId) {
				throw new Error('A task and an employee are required.');
			}
			if (!formState.shifts || formState.shifts.length === 0) {
				throw new Error('No shifts provided.');
			}
			// Check every shift before sending any, so an invalid one cannot leave part of the batch saved.
			const entries = formState.shifts.map((shift) => {
				if (!shift.dateFrom || !shift.startTime || !shift.endTime) {
					throw new Error('Incomplete shift data.');
				}
				const baseDate = shift.dateFrom instanceof Date ? shift.dateFrom : new Date(shift.dateFrom);
				const start = createLocalDate(baseDate, shift.startTime);
				const end = createLocalDate(baseDate, shift.endTime);
				if (!start || !end) {
					throw new Error('Picked time does not exist on this date.');
				}
				const startedAt = toUTC(start).toISOString();
				const stoppedAt = toUTC(end).toISOString();
				if (stoppedAt <= startedAt) {
					throw new Error('End time must be after start time.');
				}
				return { start, end };
			});
			if (checkBeforeSave) {
				const refusal = await refusalOf(checkBeforeSave, formState.employeeId, entries);
				setSaveRefusal(refusal ?? '');
				if (refusal) {
					return;
				}
			}
			await Promise.all(
				entries.map(({ start, end }) =>
					createTimesheet({
						...payload,
						startedAt: start,
						stoppedAt: end,
						taskId: payload.taskId
					})
				)
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
			className="w-full md:w-40 md:min-w-[32rem] justify-start h-[auto]"
			titleClass="flex justify-start w-full"
		>
			<div className="flex flex-col w-full gap-4 justify-start md:w-40 md:min-w-[30rem]">
				<div className=" w-full mr-[4%]">
					<label className="block mb-1.5 text-sm font-medium leading-none text-foreground">
						{t('sidebar.TASKS')}
						<span className="ml-1 text-destructive-ink">*</span>
					</label>
					<CustomSelect
						value={formState.taskId}
						onChange={pickTask}
						classNameGroup="h-[40vh]"
						ariaLabel="Task issues"
						className="w-full font-medium"
						options={tasks}
						renderOption={(option) => (
							<div className="flex overflow-y-auto gap-x-2 items-center">
								<TaskNameInfoDisplay
									task={option as any}
									className="min-w-0"
									taskTitleClassName="text-sm text-foreground"
									showSize={true}
									dash
									taskNumberClassName="text-sm text-muted-foreground"
								/>
							</div>
						)}
					/>
				</div>
				<div className="block">
					<label className="block mb-1.5 text-sm font-medium leading-none text-foreground">
						{t('manualTime.EMPLOYEE')}
						<span className="ml-1 text-destructive-ink">*</span>:
					</label>
					<CustomSelect
						valueKey="employeeId"
						value={formState.employeeId}
						classNameGroup="max-h-[40vh]"
						ariaLabel="Task issues"
						className="w-full font-medium"
						options={activeTeam?.members || []}
						onChange={(value) => {
							updateFormState('employeeId', value);
						}}
						renderOption={(option) => (
							<div className="flex gap-x-2 items-center">
								<img
									className="size-6 rounded-full object-cover hairline-ring ring-border"
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

				<div className="flex flex-col w-full">
					<ManageOrMemberComponent
						classNameTitle="text-sm font-medium text-foreground mr-12 capitalize"
						fields={fields}
						itemsLists={projectItemsLists}
						selectedValues={selectedValues}
						onSelectedValuesChange={handleSelectedValuesChange}
						handleChange={handleChange}
						itemToString={itemToString}
						itemToValue={itemToValue}
					/>
				</div>
				<div className="flex flex-col items-start w-full">
					<label className="mb-1.5 text-sm font-medium text-foreground mr-12 capitalize">
						{t('pages.timesheet.BILLABLE.BILLABLE').toLowerCase()}
					</label>
					<div className="flex gap-3 items-start">
						<ToggleButton
							isActive={isBillable}
							onClick={() => updateFormState('billableChoice', true)}
							label={t('pages.timesheet.BILLABLE.YES')}
						/>
						<ToggleButton
							isActive={!isBillable}
							onClick={() => updateFormState('billableChoice', false)}
							label={t('pages.timesheet.BILLABLE.NO')}
						/>
					</div>
				</div>

				<div className="flex flex-col w-full">
					<span className="mb-1.5 text-sm font-medium text-foreground">{t('common.NOTES')}</span>
					<textarea
						value={formState.notes}
						onChange={(e) => updateFormState('notes', e.target.value)}
						placeholder="Insert notes here..."
						className={clsxm(
							controlRecipe,
							'h-36 w-full grow resize-none p-3',
							formState.notes.trim().length === 0 && 'border-destructive ring-destructive/20'
						)}
						maxLength={120}
						minLength={0}
						aria-label="Insert notes here"
						required
					/>
					<div className="mt-1 text-xs tabular-nums text-muted-foreground text-right">
						{formState.notes.length}/{120}
					</div>
				</div>
				{saveRefusal && (
					<p role="alert" className="flex items-start gap-1.5 text-[13px] text-destructive-ink">
						<CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
						{saveRefusal}
					</p>
				)}
				<div className="flex gap-x-2 justify-end items-center w-full">
					<Button variant="outline" size="lg" type="button" onClick={closeModal}>
						{t('common.CANCEL')}
					</Button>
					<Button
						size="lg"
						disabled={isSaveDisabled || !hasTaskAndEmployee}
						onClick={() => handleAddTimesheet(formState as any)}
						type="submit"
					>
						{loadingCreateTimesheet && <Spinner className="animate-spin" />}
						{t('common.SAVE')}
					</Button>
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
	isTimeDisabled?: (time: string) => boolean;
}

const ShiftTimingSelect = ({
	label,
	timeOptions,
	placeholder,
	className,
	onChange,
	value,
	isTimeDisabled
}: ShiftTimingSelectProps) => (
	<div className={clsxm(controlGroupRecipe, 'h-9 overflow-hidden')}>
		<button
			className={clsxm(
				'flex h-full shrink-0 items-center hairline-r border-border px-2.5 text-xs font-medium text-muted-foreground focus:outline-none',
				className
			)}
		>
			{label}
		</button>
		<Select onValueChange={onChange} value={value}>
			<SelectTrigger className="h-full w-full rounded-none border-transparent bg-transparent text-ellipsis tabular-nums shadow-none ring-0 focus-visible:ring-0 dark:bg-transparent">
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent className="z-[1001] max-h-60 overflow-y-auto">
				<SelectGroup>
					{timeOptions.map((time) => (
						<SelectItem
							key={time}
							value={time}
							disabled={isTimeDisabled?.(time)}
							className="cursor-pointer tabular-nums"
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

		if (field === 'dateFrom' && value) {
			clearSkippedTimes(updatedShifts[index], new Date(value));
		}

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
					<Accordion key={index} type="single" collapsible className="w-full">
						<AccordionItem value={`item-${index}`} className="rounded-lg border-b-0 bg-foreground/3">
							<AccordionTrigger className="flex flex-row-reverse justify-end items-center gap-2 px-3 py-0 h-10 hover:no-underline">
								<div className="flex justify-between items-center w-full">
									<label className="block text-sm font-medium text-foreground">
										{t('common.DATE_AND_TIME')}
										<span className="ml-1 text-destructive-ink">*</span>:
									</label>
									<span
										onClick={() => handleRemoveShift(index)}
										className="text-sm font-normal cursor-pointer text-destructive-ink underline-offset-4 hover:underline"
									>
										{t('common.REMOVE_PERIOD')}
									</span>
								</div>
							</AccordionTrigger>
							<AccordionContent className="px-3 pb-3">
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
			<Button
				variant="ghost"
				size="default"
				onClick={handleAddShift}
				className="w-fit justify-start text-primary-ink hover:text-primary-ink"
			>
				<Plus />
				<span>{t('common.ADD_ANOTHER_PERIOD')}</span>
			</Button>
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
	// Times skipped by a daylight saving change on the picked day cannot be saved as picked.
	const baseDate = value.dateFrom ? new Date(value.dateFrom) : null;
	const isTimeDisabled = (time: string) => baseDate !== null && createLocalDate(baseDate, time) === null;

	return (
		<>
			<div className="w-[212px]">
				<span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t('manualTime.DATE')}</span>
				<DatePickerFilter
					label={value.dateFrom ? value.dateFrom.toLocaleString() : t('common.SELECT_DATE')}
					date={value.dateFrom as Date}
					setDate={(value) => onChange(index, 'dateFrom', value as any)}
				/>
			</div>
			<div className="flex flex-col gap-2 items-start w-full">
				<span className="text-xs font-medium text-muted-foreground">{t('common.SHIFT_TIMING')}</span>
				<div className="flex gap-2 justify-between items-center mb-1 w-full">
					<ShiftTimingSelect
						label="Start"
						timeOptions={timeOptions}
						placeholder="00:00:00"
						className="bg-foreground/5"
						value={value.startTime}
						onChange={(value) => onChange(index, 'startTime', value)}
						isTimeDisabled={isTimeDisabled}
					/>
					<ShiftTimingSelect
						label="End"
						timeOptions={timeOptions}
						placeholder="00:00:00"
						className="bg-foreground/5"
						value={value.endTime}
						onChange={(value) => onChange(index, 'endTime', value)}
						isTimeDisabled={isTimeDisabled}
					/>
					<button className="flex h-9 shrink-0 items-center rounded-md bg-foreground/5 px-2.5 text-sm font-medium tabular-nums focus:outline-none">
						{value.totalHours}
					</button>
				</div>
			</div>
		</>
	);
};
