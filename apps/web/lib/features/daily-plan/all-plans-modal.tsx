import { Card, InputField, Modal, NoData, Tooltip, VerticalSeparator } from 'lib/components';
import { Dispatch, memo, SetStateAction, useCallback, useMemo, useState } from 'react';
import { clsxm } from '@app/utils';
import { Text } from 'lib/components';
import { AddIcon, ChevronRightIcon } from 'assets/svg';
import { AddTasksEstimationHoursModal, SearchTaskInput } from './add-task-estimation-hours-modal';
import { useDailyPlan } from '@app/hooks';
import { Button } from '@components/ui/button';
import { Calendar } from '@components/ui/calendar';
import { IDailyPlan, ITeamTask } from '@app/interfaces';
import moment from 'moment';
import { ValueNoneIcon } from '@radix-ui/react-icons';
import { useTranslations } from 'next-intl';

interface IAllPlansModal {
	closeModal: () => void;
	isOpen: boolean;
}

type CalendarTab = 'Today' | 'Tomorrow' | 'Calendar';

/**
 * A modal that displays all the plans available to the user (Today, Tomorrow and Future).
 *
 *
 * @param {Object} props - The props Object
 * @param {boolean} props.open - If true open the modal otherwise close the modal
 * @param {() => void} props.closeModal - A function to close the modal
 *
 * @returns {JSX.Element} The modal element
 */
export const AllPlansModal = memo(function AllPlansModal(props: IAllPlansModal) {
	const { isOpen, closeModal } = props;
	const [showCalendar, setShowCalendar] = useState(false);
	const [showCustomPlan, setShowCustomPlan] = useState(false);
	const [customDate, setCustomDate] = useState<Date>();
	const { myDailyPlans, pastPlans } = useDailyPlan();

	// Utility function for checking if two dates are the same
	const isSameDate = useCallback(
		(date1: Date, date2: Date) =>
			new Date(date1).toLocaleDateString('en') === new Date(date2).toLocaleDateString('en'),
		[]
	);

	// Memoize today, tomorrow, and future plans
	const todayPlan = useMemo(
		() => myDailyPlans.items.find((plan) => isSameDate(plan.date, moment().toDate())),
		[isSameDate, myDailyPlans.items]
	);

	const tomorrowPlan = useMemo(
		() => myDailyPlans.items.find((plan) => isSameDate(plan.date, moment().add(1, 'days').toDate())),
		[isSameDate, myDailyPlans.items]
	);

	const selectedFuturePlan = useMemo(
		() => customDate && myDailyPlans.items.find((plan) => isSameDate(plan.date, customDate)),
		[isSameDate, myDailyPlans.items, customDate]
	);

	// Handle modal close
	const handleCloseModal = useCallback(() => {
		closeModal();
	}, [closeModal]);

	// Define tabs for plan selection
	const tabs: CalendarTab[] = useMemo(() => ['Today', 'Tomorrow', 'Calendar'], []);

	// State to track the active tab
	const [selectedTab, setSelectedTab] = useState(tabs[0]);

	// Handle tab switching
	const handleTabClick = (tab: CalendarTab) => {
		setSelectedTab(tab);
		setShowCalendar(tab === 'Calendar');
		setShowCustomPlan(false);
	};

	// Determine which plan to display based on the selected tab
	const plan = useMemo(() => {
		switch (selectedTab) {
			case 'Today':
				return todayPlan;
			case 'Tomorrow':
				return tomorrowPlan;
			case 'Calendar':
				return selectedFuturePlan;
			default:
				return undefined;
		}
	}, [selectedTab, todayPlan, tomorrowPlan, selectedFuturePlan]);

	const [showSearchInput, setShowSearchInput] = useState(false);
	const [defaultTask, setDefaultTask] = useState<ITeamTask | null>(null);
	const [workTimePlanned, setWorkTimePlanned] = useState<number>(0);
	const [isWorkingTimeInputFocused, setWorkingTimeInputFocused] = useState(false);
	const t = useTranslations();

	// Set the related tab for today and tomorrow dates
	const handleCalendarSelect = useCallback(() => {
		if (customDate) {
			if (
				new Date(customDate).toLocaleDateString('en') === new Date(moment().toDate()).toLocaleDateString('en')
			) {
				setSelectedTab('Today');
			} else if (
				new Date(customDate).toLocaleDateString('en') ===
				new Date(moment().add(1, 'days').toDate()).toLocaleDateString('en')
			) {
				setSelectedTab('Tomorrow');
			} else {
				setShowCalendar(false);
				setShowCustomPlan(true);
			}
		}
	}, [customDate]);

	return (
		<Modal isOpen={isOpen} closeModal={handleCloseModal} className={clsxm('w-[36rem]')}>
			<Card className="w-full  h-full overflow-hidden" shadow="custom">
				<div className="w-full flex flex-col gap-3 ">
					<div className="relative w-full h-12  flex items-center justify-center">
						{selectedTab === 'Calendar' && showCustomPlan && (
							<Tooltip label="Go back to the calendar">
								<button
									onClick={() => {
										setShowCustomPlan(false);
										setShowCalendar(true);
									}}
									className=" absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-3"
								>
									<span className="rotate-180">
										<ChevronRightIcon className="w-4  h-4 stroke-[#B1AEBC]" />
									</span>
									<span>Back</span>
								</button>
							</Tooltip>
						)}

						<Text.Heading as="h3" className="uppercase text-center">
							{selectedTab == 'Calendar'
								? showCustomPlan && selectedFuturePlan
									? `PLAN FOR ${new Date(selectedFuturePlan.date).toLocaleDateString('en-GB')}`
									: `PLANS`
								: `${selectedTab}'S PLAN`}
						</Text.Heading>
					</div>
					<div className="w-full h-12 flex items-center">
						<ul className="w-full flex items-center gap-3">
							{tabs.map((tab, index) => (
								<li
									key={index}
									className={`flex justify-center gap-4 items-center hover:text-primary cursor-pointer ${selectedTab === tab ? 'text-primary font-medium' : ''}`}
									onClick={() => handleTabClick(tab)}
								>
									<span>{tab}</span>
									{index + 1 < tabs.length && <VerticalSeparator className="w-full" />}
								</li>
							))}
						</ul>
					</div>

					<div className="w-full flex flex-col items-center justify-center h-[34rem]">
						{selectedTab === 'Calendar' && showCalendar ? (
							<div className="w-full h-full flex-col flex items-center justify-between">
								<div className="w-full grow">
									<div className="w-full h-full flex flex-col gap-4 items-center justify-center">
										<p className=" text-sm font-medium">Select a date to be able to see a plan</p>
										<div className="p-3 border flex  items-center  justify-center rounded-md">
											<FuturePlansCalendar
												selectedPlan={customDate}
												setSelectedPlan={setCustomDate}
												plans={myDailyPlans.items}
												pastPlans={pastPlans}
											/>
										</div>
									</div>
								</div>

								<div className="flex items-center justify-between h-14 w-full">
									<Button
										variant="outline"
										type="submit"
										className="py-3 px-5 rounded-md font-light text-md dark:text-white dark:bg-slate-700 dark:border-slate-600"
										onClick={handleCloseModal}
									>
										Cancel
									</Button>
									<Button
										disabled={!selectedFuturePlan}
										variant="default"
										type="submit"
										className={clsxm('py-3 px-5 rounded-md font-light text-md dark:text-white')}
										onClick={handleCalendarSelect}
									>
										Select
									</Button>
								</div>
							</div>
						) : (
							<>
								{plan ? (
									<AddTasksEstimationHoursModal
										plan={plan}
										tasks={plan.tasks ?? []}
										isRenderedInSoftFlow={false}
										isOpen={isOpen}
										closeModal={handleCloseModal}
									/>
								) : (
									<>
										{showSearchInput ? (
											<SearchTaskInput
												defaultTask={defaultTask}
												setDefaultTask={setDefaultTask}
												setShowSearchInput={setShowSearchInput}
												selectedPlan={myDailyPlans.items[0]}
											/>
										) : (
											<div className=" w-full flex flex-col gap-2">
												<span className="text-sm">
													{t('timer.todayPlanSettings.WORK_TIME_PLANNED')}{' '}
													<span className="text-red-600">*</span>
												</span>
												<div className="w-full flex gap-3 h-[3rem]">
													<InputField
														type="number"
														placeholder={t(
															'timer.todayPlanSettings.WORK_TIME_PLANNED_PLACEHOLDER'
														)}
														className="h-full"
														wrapperClassName=" h-full"
														onChange={(e) => {
															!isNaN(parseInt(e.target.value))
																? setWorkTimePlanned(parseInt(e.target.value))
																: setWorkTimePlanned(0);
														}}
														required
														noWrapper
														min={0}
														value={
															!isNaN(workTimePlanned) &&
															workTimePlanned.toString() !== '0'
																? workTimePlanned.toString().replace(/^0+/, '')
																: isWorkingTimeInputFocused
																	? ''
																	: 0
														}
														onFocus={() => setWorkingTimeInputFocused(true)}
														onBlur={() => setWorkingTimeInputFocused(false)}
														defaultValue={0}
													/>
													<button
														onClick={() => {
															setShowSearchInput(true);
														}}
														className="h-full shrink-0 rounded-lg border w-10 flex items-center justify-center"
													>
														<AddIcon className="w-4 h-4 text-dark dark:text-white" />
													</button>
												</div>
											</div>
										)}
										<div className="flex justify-center items-center h-full">
											<NoData component={<ValueNoneIcon />} text="Plan not found " />
										</div>
									</>
								)}
							</>
						)}
					</div>
				</div>
			</Card>
		</Modal>
	);
});

/**
 * -------------------------------------------------------
 * 		----------------- Calendar ------------------
 * -------------------------------------------------------
 */

interface ICalendarProps {
	setSelectedPlan: Dispatch<SetStateAction<Date | undefined>>;
	selectedPlan: Date | undefined;
	plans: IDailyPlan[];
	pastPlans: IDailyPlan[];
}

/**
 * The component that handles the selection of a plan
 *
 * @param {Object} props - The props object
 * @param {Dispatch<SetStateAction<IDailyPlan>>} props.setSelectedFuturePlan - A function that set the selected plan
 * @param {IDailyPlan} props.selectedFuturePlan - The selected plan
 * @param {IDailyPlan[]} props.plans - Available plans
 * @param {IDailyPlan[]} props.pastPlans - Past plans
 *
 * @returns {JSX.Element} The Calendar component.
 */
const FuturePlansCalendar = memo(function FuturePlansCalendar(props: ICalendarProps) {
	const { selectedPlan, setSelectedPlan, plans, pastPlans } = props;

	const sortedPlans = useMemo(
		() =>
			[...plans].sort((plan1, plan2) =>
				new Date(plan1.date).getTime() < new Date(plan2.date).getTime() ? 1 : -1
			),
		[plans]
	);

	/**
	 * A helper function that checks if a given date has not a plan
	 *
	 * @param {Date} date - The date to check
	 *
	 * @returns {boolean} true if the date has a plan, false otherwise
	 */
	const isDateUnplanned = useCallback(
		(dateToCheck: Date) => {
			return !plans
				.map((plan) => new Date(plan.date))
				.some(
					(date) => new Date(date).toLocaleDateString('en') == new Date(dateToCheck).toLocaleDateString('en')
				);
		},
		[plans]
	);

	return (
		<Calendar
			mode="single"
			captionLayout="dropdown"
			selected={selectedPlan ? new Date(selectedPlan) : undefined}
			onSelect={(date) => {
				if (date) {
					setSelectedPlan(date);
				}
			}}
			initialFocus
			disabled={isDateUnplanned}
			modifiers={{
				booked: sortedPlans?.map((plan) => new Date(plan.date)),
				pastDay: pastPlans?.map((plan) => new Date(plan.date))
			}}
			modifiersClassNames={{
				booked: clsxm(
					'relative after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-primary after:rounded-full'
				),
				selected: clsxm('bg-primary after:hidden text-white !rounded-full'),

				pastDay: clsxm(
					'relative after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-yellow-600 after:rounded-full'
				),
				today: clsxm('border-2 !border-yellow-700 rounded')
			}}
			fromYear={new Date(sortedPlans?.[0]?.date ?? Date.now())?.getFullYear()}
			toYear={new Date(sortedPlans?.[sortedPlans?.length - 1]?.date ?? Date.now())?.getFullYear() + 5}
		/>
	);
});

FuturePlansCalendar.displayName = 'FuturePlansCalendar';
