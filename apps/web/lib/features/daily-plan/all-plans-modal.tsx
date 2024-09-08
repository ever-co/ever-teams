import { Card, Modal, NoData, Tooltip, VerticalSeparator } from 'lib/components';
import { Dispatch, memo, SetStateAction, useCallback, useMemo, useState } from 'react';
import { clsxm } from '@app/utils';
import { Text } from 'lib/components';
import { ChevronRightIcon } from 'assets/svg';
import { AddTasksEstimationHoursModal } from './add-task-estimation-hours-modal';
import { useDailyPlan } from '@app/hooks';
import { Button } from '@components/ui/button';
import { Calendar } from '@components/ui/calendar';
import { IDailyPlan } from '@app/interfaces';
import moment from 'moment';
import { ValueNoneIcon } from '@radix-ui/react-icons';

interface IAllPlansModal {
	closeModal: () => void;
	isOpen: boolean;
}

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
	const { futurePlans, myDailyPlans } = useDailyPlan();

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
	const tabs = useMemo(() => ['Today', 'Tomorrow', 'Future'], []);

	// State to track the active tab
	const [selectedTab, setSelectedTab] = useState(tabs[0]);

	// Handle tab switching
	const handleTabClick = (tab: string) => {
		setSelectedTab(tab);
		setShowCalendar(tab === 'Future');
		setShowCustomPlan(false);
	};

	// Determine which plan to display based on the selected tab
	const plan = useMemo(() => {
		switch (selectedTab) {
			case 'Today':
				return todayPlan;
			case 'Tomorrow':
				return tomorrowPlan;
			case 'Future':
				return selectedFuturePlan;
			default:
				return undefined;
		}
	}, [selectedTab, todayPlan, tomorrowPlan, selectedFuturePlan]);
	return (
		<Modal isOpen={isOpen} closeModal={handleCloseModal} className={clsxm('w-[36rem]')}>
			<Card className="w-full  h-full overflow-hidden" shadow="custom">
				<div className="w-full flex flex-col gap-3 ">
					<div className="relative w-full h-12  flex items-center justify-center">
						{selectedTab === 'Future' && showCustomPlan && (
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
							{selectedTab == 'Future'
								? showCustomPlan && selectedFuturePlan
									? `PLAN FOR ${new Date(selectedFuturePlan.date).toLocaleDateString('en-GB')}`
									: `${selectedTab} PLAN`
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

					<div className="w-full flex   items-center justify-center h-[34rem]">
						{selectedTab === 'Future' && showCalendar ? (
							<div className="w-full h-full flex-col flex items-center justify-between">
								<div className="w-full grow">
									<div className="w-full h-full flex flex-col gap-4 items-center justify-center">
										<p className=" text-sm font-medium">Select a date to be able to see a plan</p>
										<div className="p-3 border flex  items-center  justify-center rounded-md">
											<FuturePlansCalendar
												futurePlans={futurePlans}
												selectedFuturePlan={customDate}
												setSelectedFuturePlan={setCustomDate}
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
										onClick={() => {
											setShowCalendar(false);
											setShowCustomPlan(true);
										}}
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
									<NoData component={<ValueNoneIcon />} text="Plan not found " />
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
	setSelectedFuturePlan: Dispatch<SetStateAction<Date | undefined>>;
	selectedFuturePlan: Date | undefined;
	futurePlans: IDailyPlan[];
}

/**
 * The component tha handles the selection of a future plan
 *
 * @param {Object} props - The props object
 * @param {Dispatch<SetStateAction<IDailyPlan>>} props.setSelectedFuturePlan - A function that set the selected plan
 * @param {IDailyPlan} props.selectedFuturePlan - The selected plan
 */
const FuturePlansCalendar = memo(function FuturePlansCalendar(props: ICalendarProps) {
	const { futurePlans, selectedFuturePlan, setSelectedFuturePlan } = props;

	const sortedFuturePlans = useMemo(
		() =>
			futurePlans
				.filter(
					(plan) =>
						new Date(plan.date).toLocaleDateString('en') !==
						new Date(moment().add(1, 'days').toDate()).toLocaleDateString('en')
				)
				.sort((plan1, plan2) => (new Date(plan1.date).getTime() < new Date(plan2.date).getTime() ? 1 : -1)),
		[futurePlans]
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
			return !futurePlans
				// Start from the day after tomorrow (Tomorrow has a tab)
				.filter(
					(plan) =>
						new Date(plan.date).toLocaleDateString('en') !==
						new Date(moment().add(1, 'days').toDate()).toLocaleDateString('en')
				)
				.map((plan) => new Date(plan.date))
				.some(
					(date) => new Date(date).toLocaleDateString('en') == new Date(dateToCheck).toLocaleDateString('en')
				);
		},
		[futurePlans]
	);

	return (
		<Calendar
			mode="single"
			captionLayout="dropdown"
			selected={selectedFuturePlan ? new Date(selectedFuturePlan) : undefined}
			onSelect={(date) => {
				if (date) {
					setSelectedFuturePlan(date);
				}
			}}
			initialFocus
			disabled={isDateUnplanned}
			modifiers={{
				booked: sortedFuturePlans?.map((plan) => new Date(plan.date))
			}}
			modifiersClassNames={{
				booked: clsxm(
					'relative after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-primary after:rounded-full'
				),
				selected: clsxm('bg-primary text-white !rounded-full')
			}}
			fromMonth={new Date(sortedFuturePlans?.[0]?.date ?? Date.now())}
			toMonth={new Date(sortedFuturePlans?.[sortedFuturePlans?.length - 1]?.date ?? Date.now())}
			fromYear={new Date(sortedFuturePlans?.[0]?.date ?? Date.now())?.getFullYear()}
			toYear={new Date(sortedFuturePlans?.[sortedFuturePlans?.length - 1]?.date ?? Date.now())?.getFullYear()}
		/>
	);
});

FuturePlansCalendar.displayName = 'FuturePlansCalendar';
