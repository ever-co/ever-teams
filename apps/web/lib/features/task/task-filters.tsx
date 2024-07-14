'use client';

/* eslint-disable no-mixed-spaces-and-tabs */
import {
	I_UserProfilePage,
	useAuthenticateUser,
	useDailyPlan,
	useOrganizationTeams,
	useOutsideClick,
	useModal,
	useTeamTasks
} from '@app/hooks';
import { IClassName, ITeamTask } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Transition } from '@headlessui/react';
import { Button, InputField, Tooltip, VerticalSeparator } from 'lib/components';
import { SearchNormalIcon } from 'assets/svg';
import intersection from 'lodash/intersection';
import { useCallback, useEffect, useMemo, useState, FormEvent } from 'react';
import { TaskUnOrAssignPopover } from './task-assign-popover';
import { TaskLabelsDropdown, TaskPropertiesDropdown, TaskSizesDropdown, TaskStatusDropdown } from './task-status';
import { useTranslations } from 'next-intl';
import { SettingFilterIcon, TrashIcon } from 'assets/svg';
import { DailyPlanFilter } from './daily-plan/daily-plan-filter';
import { Modal, Divider } from 'lib/components';
import api from '@app/services/client/axios';
import { MdOutlineMoreTime } from "react-icons/md";
import { IoIosTimer } from "react-icons/io";
import { FiLoader } from "react-icons/fi";
import { DatePicker } from '@components/ui/DatePicker';
import { PencilSquareIcon } from '@heroicons/react/20/solid';
import { FaRegCalendarAlt } from "react-icons/fa";

type ITab = 'worked' | 'assigned' | 'unassigned' | 'dailyplan';
type ITabs = {
	tab: ITab;
	name: string;
	count: number;
	description: string;
};

type FilterType = 'status' | 'search' | undefined;
type IStatusType = 'status' | 'size' | 'priority' | 'label';
type StatusFilter = { [x in IStatusType]: string[] };

/**
 * It returns an object with the current tab, a function to set the current tab, and an array of tabs
 * @param {I_UserProfilePage} hook - I_UserProfilePage - this is the hook that we're using in the
 * component.
 */
export function useTaskFilter(profile: I_UserProfilePage) {
	const t = useTranslations();
	const defaultValue =
		typeof window !== 'undefined' ? (window.localStorage.getItem('task-tab') as ITab) || null : 'worked';

	const { activeTeamManagers, activeTeam } = useOrganizationTeams();
	const { user } = useAuthenticateUser();
	const { profileDailyPlans } = useDailyPlan();

	const isManagerConnectedUser = activeTeamManagers.findIndex((member) => member.employee?.user?.id == user?.id);
	const canSeeActivity = profile.userProfile?.id === user?.id || isManagerConnectedUser != -1;

	const [tab, setTab] = useState<ITab>(defaultValue || 'worked');
	const [filterType, setFilterType] = useState<FilterType>(undefined);

	const [statusFilter, setStatusFilter] = useState<StatusFilter>({} as StatusFilter);

	const [appliedStatusFilter, setAppliedStatusFilter] = useState<StatusFilter>({} as StatusFilter);

	const [taskName, setTaskName] = useState('');

	const tasksFiltered: { [x in ITab]: ITeamTask[] } = {
		unassigned: profile.tasksGrouped.unassignedTasks,
		assigned: profile.tasksGrouped.assignedTasks,
		worked: profile.tasksGrouped.workedTasks,
		dailyplan: [] // Change this soon
	};

	const tasks = tasksFiltered[tab];

	const outclickFilterCard = useOutsideClick<HTMLDivElement>(() => {
		if (filterType === 'search' && taskName.trim().length === 0) {
			setFilterType(undefined);
		} else if (filterType === 'status') {
			const hasStatus = (Object.keys(statusFilter) as IStatusType[]).some((skey) => {
				return statusFilter[skey] && statusFilter[skey].length > 0;
			});
			!hasStatus && setFilterType(undefined);
		}
	});

	const tabs: ITabs[] = [
		{
			tab: 'assigned',
			name: t('common.ASSIGNED'),
			description: t('task.tabFilter.ASSIGNED_DESCRIPTION'),
			count: profile.tasksGrouped.assignedTasks.length
		},
		{
			tab: 'unassigned',
			name: t('common.UNASSIGNED'),
			description: t('task.tabFilter.UNASSIGNED_DESCRIPTION'),
			count: profile.tasksGrouped.unassignedTasks.length
		}
	];

	// For tabs on profile page, display "Worked" and "Daily Plan" only for the logged in user or managers
	if (activeTeam?.shareProfileView || canSeeActivity) {
		tabs.push({
			tab: 'dailyplan',
			name: 'Daily Plan',
			description: 'This tab shows all yours tasks planned',
			count: profile.tasksGrouped.dailyplan?.length
		});
		tabs.unshift({
			tab: 'worked',
			name: t('common.WORKED'),
			description: t('task.tabFilter.WORKED_DESCRIPTION'),
			count: profile.tasksGrouped.workedTasks.length
		});
	}

	useEffect(() => {
		window.localStorage.setItem('task-tab', tab);
	}, [tab]);

	useEffect(() => {
		setTaskName('');
	}, [filterType]);

	const toggleFilterType = useCallback(
		(type: NonNullable<FilterType>) => {
			setFilterType((flt) => {
				return flt === type ? undefined : type;
			});
		},
		[setFilterType]
	);

	const onChangeStatusFilter = useCallback(
		(type: IStatusType, value: string[]) => {
			return setStatusFilter((state) => {
				return {
					...state,
					[type]: value
				};
			});
		},
		[setStatusFilter]
	);

	// Reset status applied filter status when filter changed
	useEffect(() => {
		if (filterType !== 'status') {
			setAppliedStatusFilter({} as StatusFilter);
		}
	}, [filterType]);

	const onResetStatusFilter = useCallback(() => {
		setStatusFilter({} as StatusFilter);
		setAppliedStatusFilter({} as StatusFilter);
	}, [setStatusFilter]);

	/**
	 * Apply filter status filter
	 */
	const applyStatusFilder = useCallback(() => {
		setAppliedStatusFilter(statusFilter);
	}, [statusFilter]);

	const $tasks = useMemo(() => {
		const n = taskName.trim().toLowerCase();
		const statusFilters = appliedStatusFilter;

		return tasks
			.filter((task) => {
				return n ? task.title.toLowerCase().includes(n) : true;
			})
			.filter((task) => {
				const keys = Object.keys(statusFilters) as IStatusType[];

				return keys
					.filter((k) => statusFilters[k].length > 0)
					.every((k) => {
						return k === 'label'
							? intersection(
								statusFilters[k],
								task['tags'].map((item) => item.name)
							).length === statusFilters[k].length
							: statusFilters[k].includes(task[k]);
					});
			});
	}, [tasks, taskName, appliedStatusFilter]);

	return {
		tab,
		setTab,
		tabs,
		filterType,
		toggleFilterType,
		tasksFiltered: $tasks,
		taskName,
		setTaskName,
		statusFilter,
		onChangeStatusFilter,
		onResetStatusFilter,
		applyStatusFilder,
		tasksGrouped: profile.tasksGrouped,
		outclickFilterCard,
		profileDailyPlans
	};
}

export type I_TaskFilter = ReturnType<typeof useTaskFilter>;

/**
 * It's a wrapper for two components, one of which is a wrapper for another component
 * @param  - IClassName & { hook: I_TaskFilter }
 * @returns A div with a className of 'flex justify-between' and a className of whatever is passed in.
 */

type Props = { hook: I_TaskFilter; profile: I_UserProfilePage };
export function TaskFilter({ className, hook, profile }: IClassName & Props) {


	return (
		<div className="relative w-full z-10">
			<div
				className={clsxm(
					'flex justify-between flex-col xs:flex-row  items-center w-full flex-wrap-reverse lg:flex-nowrap',
					className
				)}
			>
				<TabsNav hook={hook} />
				<InputFilters profile={profile} hook={hook} />
			</div>

			{/*  It's a transition component that is used to animate the transition of the TaskStatusFilter
		component. */}
			<Transition
				show={hook.filterType !== undefined}
				enter="transition duration-100 ease-out"
				enterFrom="transform scale-95 opacity-0"
				enterTo="transform scale-100 opacity-100"
				leave="transition duration-75 ease-out"
				leaveFrom="transform scale-100 opacity-100"
				leaveTo="transform scale-95 opacity-0 ease-out"
				className="w-full"
				ref={hook.outclickFilterCard.targetEl}
			>
				{/* {hook.filterType !== undefined && <Divider className="mt-4" />} */}
				{hook.filterType === 'status' && (
					<TaskStatusFilter hook={hook} employeeId={profile.member?.employeeId || ''} />
				)}
				{hook.filterType === 'search' && (
					<TaskNameFilter
						value={hook.taskName}
						setValue={hook.setTaskName}
						close={() => {
							hook.toggleFilterType('search');
						}}
					/>
				)}
			</Transition>
		</div>
	);
}

/**
 * It renders a search icon, a vertical separator, a filter button, and an assign task button
 * @returns A div with a button, a vertical separator, a button, and a button.
 */
function InputFilters({ hook, profile }: Props) {
	const t = useTranslations();
	const [loading, setLoading] = useState(false);
	const { tasks } = useTeamTasks();
	const { activeTeam } = useOrganizationTeams();
	const members = activeTeam?.members;

	const [date, setDate] = useState<string>('');
	const [isBillable, setIsBillable] = useState<boolean>(false);
	const [startTime, setStartTime] = useState<string>('');
	const [endTime, setEndTime] = useState<string>('');
	const [team, setTeam] = useState<string>('');
	const [task, setTask] = useState<string>('');
	const [description, setDescription] = useState<string>('');
	const [reason, setReason] = useState<string>('');
	const [timeDifference, setTimeDifference] = useState<string>('');
	const [minStartTime, setMinStartTime] = useState<string>('');
	const [errorMsg, setError] = useState<string>('');
	const [loadin, setLoadin] = useState<boolean>(false);

	const { isOpen, openModal, closeModal } = useModal();

	useEffect(() => {
		const now = new Date();
		const currentDate = now.toISOString().slice(0, 10);
		const currentTime = now.toTimeString().slice(0, 5);
		setMinStartTime(currentTime);

		setDate(currentDate);
		setStartTime(currentTime);
		setEndTime(currentTime);
	}, []);


	const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		const timeObject = {
			date,
			isBillable,
			startTime,
			endTime,
			team,
			task,
			description,
			reason,
			timeDifference
		};

		if (date && startTime && endTime && team && task) {
			setLoading(true);
			setError('');
			const postData = async () => {
				try {
					const response = await api.post('/add_time', timeObject);
					if (response.data.message) {
						setLoadin(false);
						closeModal();
					}

				} catch (err) {
					setError('Failed to post data');
					setLoadin(false);
				}
			};

			postData();
		} else {
			setError(`Please complete all required fields with a ${"*"}`)
		}


	};

	const calculateTimeDifference = () => {

		if (!startTime || !endTime) {
			return;
		}

		const [startHours, startMinutes] = startTime.split(':').map(Number);
		const [endHours, endMinutes] = endTime.split(':').map(Number);

		const startTotalMinutes = startHours * 60 + startMinutes;
		const endTotalMinutes = endHours * 60 + endMinutes;

		const diffMinutes = endTotalMinutes - startTotalMinutes;
		if (diffMinutes < 0) {
			return;
		}

		const hours = Math.floor(diffMinutes / 60);
		const minutes = diffMinutes % 60;

		setTimeDifference(`${hours} Hours ${minutes} Minutes`);
	};

	useEffect(() => {
		calculateTimeDifference();
	}, [endTime, startTime]);

	useEffect(() => {
		if (task == '') {
			setTask(tasks[0]?.id);
		}
		if (team == '') {
			members && setTeam(members[0].id);
		}

	}, [tasks, members])

	const osSpecificAssignTaskTooltipLabel = 'A';

	return (
		<div className="flex items-center mt-8 space-x-2 lg:space-x-5 xs:mt-4">
			<button
				ref={hook.outclickFilterCard.ignoreElementRef}
				className={clsxm('outline-none')}
				onClick={() => hook.toggleFilterType('search')}
			>
				<SearchNormalIcon
					className={clsxm(
						'dark:stroke-white w-4 h-4',
						hook.filterType === 'search' && ['stroke-primary-light dark:stroke-primary-light']
					)}
				/>
			</button>

			<VerticalSeparator />

			<button
				ref={hook.outclickFilterCard.ignoreElementRef}
				className={clsxm(
					'p-3 px-5 flex space-x-2 input-border rounded-xl items-center text-sm',
					hook.filterType === 'status' && ['bg-gray-lighter'],
					'h-[2.75rem]'
				)}
				onClick={() => hook.toggleFilterType('status')}
			>
				<SettingFilterIcon className="dark:text-white w-3.5" strokeWidth="1.8" />
				<span>{t('common.FILTER')}</span>
			</button>
			<button
				onClick={() => openModal()}
				className="p-[10px] text-white rounded-[12px] min-w-[200px] border-[1px] text-[15px] flex items-center bg-[#3826A6]"
			>
				<MdOutlineMoreTime size={20} className="mr-[10px]" />{"Add manual time"}
			</button>

			{/* Assign task combobox */}
			<TaskUnOrAssignPopover
				onTaskClick={(task, close) => {
					setLoading(true);
					close();
					profile.assignTask(task).finally(() => setLoading(false));
				}}
				tasks={hook.tasksGrouped.unassignedTasks}
				buttonClassName="mb-0 h-full"
				onTaskCreated={(_, close) => close()}
				usersTaskCreatedAssignTo={profile.member?.employeeId ? [{ id: profile.member?.employeeId }] : undefined}
				userProfile={profile.member}
			>
				<Tooltip label={osSpecificAssignTaskTooltipLabel} placement="auto">
					<Button
						loading={loading}
						className={clsxm(
							'dark:bg-gradient-to-tl dark:from-regal-rose dark:to-regal-blue h-full px-4 py-3 rounded-xl text-base',
							'min-w-[8.25rem] h-[2.75rem]'
						)}
					>
						{t('common.ASSIGN_TASK')}
					</Button>
				</Tooltip>
			</TaskUnOrAssignPopover>
			<div>
				<Modal
					isOpen={isOpen}
					closeModal={closeModal}
					title={'Add time'}
					className="bg-light--theme-light dark:bg-dark--theme-light py-5 rounded-xl w-full md:min-w-[20vw] md:max-w-fit h-[auto] justify-start"
					titleClass="text-[16px] font-bold"
				>
					<Divider className="mt-4" />
					<form onSubmit={handleSubmit} className="text-[13px] w-[80%]">
						<div className="mb-4">
							<label className="block text-gray-700 mb-1">Date<span className="text-[#de5505e1] ml-1">*</span></label>
							<div className="w-full p-2 border border-gray-300 rounded-[10px]">
								<DatePicker
									buttonVariant={'link'}
									buttonClassName={'p-0 decoration-transparent h-[0.875rem] w-full'}
									customInput={
										<div
											className={clsxm(
												'not-italic cursor-pointer font-semibold text-[0.625rem] 3xl:text-xs w-full',
												'leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white w-full'
											)}
										>
											{
												date ?
													<div className="flex items-center w-full">
														<FaRegCalendarAlt size={20} fill={"#13648fa9"} className="mx-[20px]" />
														{date}
													</div>
													: (
														<PencilSquareIcon className="dark:text-white text-dark w-4 h-4" />
													)}
										</div>
									}
									selected={new Date()}
									onSelect={(dateI) => {
										dateI && setDate(dateI.toDateString());
									}}
									mode={'single'}
								/>
							</div>
						</div>

						<div className="mb-4 flex items-center">
							<label className="block text-gray-700 mr-2">Billable</label>
							<div
								className={`w-12 h-6 flex items-center bg-[#3726a662] rounded-full p-1 cursor-pointer `}
								onClick={() => setIsBillable(!isBillable)}
								style={isBillable ? { background: 'linear-gradient(to right, #3726a662, transparent)' } : { background: '#3726a662' }}
							>
								<div
									className={`bg-[#3826A6] w-4 h-4 rounded-full shadow-md transform transition-transform ${isBillable ? 'translate-x-6' : 'translate-x-0'}`}
								/>
							</div>
						</div>
						<div className='flex items-center'>
							<div className="mb-4 w-[48%] mr-[4%]">
								<label className="block text-gray-700 mb-1">Start time<span className="text-[#de5505e1] ml-1">*</span></label>
								<input
									type="time"
									value={startTime}
									onChange={(e) => setStartTime(e.target.value)}
									className="w-full p-2 border text-[13px] font-bold border-gray-300 rounded-[10px]"
									min={minStartTime}
									required
								/>

							</div>

							<div className="mb-4 w-[48%]">
								<label className="block text-gray-700 mb-1">End time<span className="text-[#de5505e1] ml-1">*</span></label>
								<input
									type="time"
									value={endTime}
									onChange={(e) => setEndTime(e.target.value)}
									className="w-full p-2 border text-[13px] font-bold border-gray-300 rounded-[10px]"
									min={startTime}
									required
								/>
							</div>
						</div>

						<div className="mb-4 flex items-center">
							<label className="block text-gray-700 mb-1">Added hours: </label>
							<div
								className="ml-[10px] p-[10px] flex items-center font-bold border-[#410a504e] rounded-[10px]"
								style={{ background: 'linear-gradient(to right, #0085c8a4, #410a504e )' }}
							>
								<IoIosTimer size={20} className="mr-[10px]" />
								{timeDifference}
							</div>
						</div>

						<div className="mb-4">
							<label className="block text-gray-700 mb-1">Team<span className="text-[#de5505e1] ml-1">*</span></label>
							<select
								value={team}
								onChange={(e) => setTeam(e.target.value)}
								className="w-full p-2 border border-gray-300 rounded-[10px] font-bold"
							>
								{members?.map((member) => (
									<option key={member.id} value={member.id}>{member.employee?.user?.firstName}</option>))
								}
							</select>
						</div>

						<div className="mb-4">
							<label className="block text-gray-700 mb-1">Task<span className="text-[#de5505e1] ml-1">*</span></label>
							<select
								value={task}
								onChange={(e) => setTask(e.target.value)}
								className="w-full p-2 border border-gray-300 rounded-[10px] font-bold"
							>
								{tasks?.map((task) => (
									<option key={task.id} value={task.id}>{task.title}</option>
								))}
							</select>
						</div>

						<div className="mb-4">
							<label className="block text-gray-700 mb-1">Description</label>
							<textarea
								value={description}
								placeholder="What worked on?"
								onChange={(e) => setDescription(e.target.value)}
								className="w-full p-2 border border-gray-300 rounded-[10px]"
							/>
						</div>

						<div className="mb-4">
							<label className="block text-gray-700 mb-1">Reason</label>
							<textarea
								value={reason}
								onChange={(e) => setReason(e.target.value)}
								className="w-full p-2 border border-gray-300 rounded-[10px]"
							/>
						</div>

						<div className="flex justify-between items-center">
							<button type="button" className="text-[#3826A6] font-bold p-[12px] rounded-[10px] border-[1px] bo">View timesheet</button>
							<button type="submit" className="bg-[#3826A6] font-bold min-w-[110px] flex flex-col items-center text-white p-[12px] rounded-[10px]">
								{loadin ? <FiLoader size={20} className="animate-spin" /> : "Add time"}
							</button>
						</div>
						<div className="m-4 text-[#ff6a00de]">{errorMsg}</div>

					</form>
				</Modal>
			</div>
		</div >
	);
}

/* It's a function that returns a nav element. */
function TabsNav({ hook }: { hook: I_TaskFilter }) {
	return (
		<nav className="flex justify-center md:justify-start items-center mt-4 space-x-1 w-full md:space-x-4 md:mt-0">
			{hook.tabs.map((item, i) => {
				const active = item.tab === hook.tab;

				return (
					<Tooltip key={i} placement="top-start" label={item.description} className="">
						<button
							onClick={() => hook.setTab(item.tab)}
							className={clsxm(
								`md:text-lg text-xs text-gray-500 font-normal outline-none md:py-[1.5rem] px-[2.5rem] relative mt-4 md:mt-0 w-full md:min-w-[10.625rem] flex flex-col md:flex-row gap-1 items-center `,
								active && ['text-primary dark:text-white']
							)}
						>
							{item.name}{' '}
							<span
								className={clsxm(
									'bg-gray-lighter p-1 px-2 text-xs rounded-md m-1',
									active && ['bg-primary dark:bg-[#47484D] text-white']
								)}
							>
								{item.count}
							</span>
							{active && (
								<div
									className={clsxm(
										'bg-primary dark:bg-white',
										'h-[0.1875rem] absolute -bottom-3 left-0 right-0 w-full'
									)}
								/>
							)}
						</button>
					</Tooltip>
				);
			})}
		</nav>
	);
}
/**
 * It renders a divider, a div with a flexbox layout, and filters buttons
 * @returns A React component
 */
export function TaskStatusFilter({ hook, employeeId }: { hook: I_TaskFilter; employeeId: string }) {
	const [key, setKey] = useState(0);
	const t = useTranslations();

	return (
		<div className="flex flex-col items-center mt-4 space-x-2 md:justify-between md:flex-row pt-2">
			<div className="flex flex-wrap justify-center flex-1 space-x-3 md:justify-start">
				<TaskStatusDropdown
					key={key + 1}
					onValueChange={(_, values) => hook.onChangeStatusFilter('status', values || [])}
					className="lg:min-w-[170px] mt-4 mb-2 lg:mt-0"
					multiple={true}
				/>

				<TaskPropertiesDropdown
					key={key + 2}
					onValueChange={(_, values) => hook.onChangeStatusFilter('priority', values || [])}
					className="lg:min-w-[170px] mt-4 mb-2 lg:mt-0"
					multiple={true}
				/>

				<TaskSizesDropdown
					key={key + 3}
					onValueChange={(_, values) => hook.onChangeStatusFilter('size', values || [])}
					className="lg:min-w-[170px] mt-4 mb-2 lg:mt-0"
					multiple={true}
				/>

				<TaskLabelsDropdown
					key={key + 4}
					onValueChange={(_, values) => hook.onChangeStatusFilter('label', values || [])}
					className="lg:min-w-[170px] mt-4 mb-2 lg:mt-0"
					multiple={true}
				/>

				{hook.tab === 'dailyplan' && <DailyPlanFilter employeeId={employeeId} />}

				<VerticalSeparator />

				<Button className="py-2 md:px-3 px-2 min-w-[6.25rem] rounded-xl h-9" onClick={hook.applyStatusFilder}>
					{t('common.APPLY')}
				</Button>
				<Button
					className="py-2 md:px-3 px-2 min-w-[6.25rem] rounded-xl h-9"
					variant="grey"
					onClick={() => {
						setKey((k) => k + 1);
						hook.onResetStatusFilter();
					}}
				>
					{t('common.RESET')}
				</Button>
				<Button
					className="py-2 md:px-3 px-2 min-w-[6.25rem] rounded-xl h-9"
					variant="outline-danger"
					onClick={() => {
						hook.toggleFilterType('status');
					}}
				>
					{t('common.CLOSE')}
				</Button>
			</div>
		</div>
	);
}

export function TaskNameFilter({
	value,
	setValue,
	close,
	fullWidth = false
}: {
	value: string;
	setValue: (v: string) => void;
	close: () => void;
	fullWidth?: boolean;
}) {
	const t = useTranslations();

	const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
	const [tempValue, setTempValue] = useState<string>(value);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const inputValue = e.target.value;
		setTempValue(inputValue);

		if (typingTimeout) {
			clearTimeout(typingTimeout);
		}

		const newTimeout = setTimeout(() => {
			setValue(inputValue);
		}, 300);

		setTypingTimeout(newTimeout);
	};

	return (
		<div className={clsxm('flex flex-row w-full md:w-1/2 gap-2 mt-0 ml-auto', fullWidth && '!w-full')}>
			<InputField
				value={tempValue}
				autoFocus={true}
				onChange={(e) => handleInputChange(e)}
				placeholder={t('common.TYPE_SOMETHING') + '...'}
				wrapperClassName="mb-0 dark:bg-transparent !w-full rounded-xl"
			/>
			<Button className="py-1 md:px-3 px-1 min-w-[5rem] rounded-xl" variant="outline-danger" onClick={close}>
				{t('common.CLOSE')}
			</Button>
		</div>
	);
}
