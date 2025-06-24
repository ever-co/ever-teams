import { Modal, NoData, SpinnerLoader } from '@/core/components';
import { Dispatch, memo, SetStateAction, useCallback, useMemo, useRef, useState } from 'react';
import { clsxm } from '@/core/lib/utils';
import { Text } from '@/core/components';
import { ChevronRightIcon } from 'assets/svg';
import { AddTasksEstimationHoursModal } from '../features/daily-plan/add-task-estimation-hours-modal';
import { useAuthenticateUser, useDailyPlan } from '@/core/hooks';
import { Button } from '@/core/components/duplicated-components/_button';
import { Calendar } from '@/core/components/common/calendar';
import moment from 'moment';
import { ValueNoneIcon } from '@radix-ui/react-icons';
import { checkPastDate } from '@/core/lib/helpers';
import { useTranslations } from 'next-intl';
import { ActiveModifiers } from 'react-day-picker';
import { EverCard } from '../common/ever-card';
import { Tooltip } from '../duplicated-components/tooltip';
import { VerticalSeparator } from '../duplicated-components/separator';
import { EDailyPlanStatus } from '@/core/types/generics/enums/daily-plan';
import { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';
import { ITask } from '@/core/types/interfaces/task/task';

interface IAllPlansModal {
	closeModal: () => void;
	isOpen: boolean;
}

type TCalendarTab = 'Today' | 'Tomorrow' | 'Calendar';
type TNavigationMode = 'DATE' | 'PLAN';

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
	// Utility function for checking if two dates are the same
	const isSameDate = useCallback((date1: Date | number | string, date2: Date | number | string) => {
		return moment(date1).toISOString().split('T')[0] === moment(date2).toISOString().split('T')[0];
	}, []);

	const { isOpen, closeModal } = props;
	const [showCalendar, setShowCalendar] = useState(false);
	const [showCustomPlan, setShowCustomPlan] = useState(false);
	const [customDate, setCustomDate] = useState<Date>(moment().toDate());
	const { myDailyPlans, pastPlans } = useDailyPlan();
	const t = useTranslations();
	const [navigationMode, setNavigationMode] = useState<TNavigationMode>('PLAN');
	const sortedPlans = useMemo(
		() =>
			[...myDailyPlans?.items].sort((plan1, plan2) =>
				new Date(plan1.date).getTime() > new Date(plan2.date).getTime() ? 1 : -1
			),
		[myDailyPlans?.items]
	);
	const currentPlanIndex = useMemo(
		() => sortedPlans.findIndex((plan) => isSameDate(plan.date, moment(customDate).toDate())),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[customDate, myDailyPlans?.items]
	);
	const nextPlan = useMemo(
		() =>
			currentPlanIndex >= 0 && currentPlanIndex < myDailyPlans?.items?.length - 1
				? sortedPlans[currentPlanIndex + 1]
				: null,
		[currentPlanIndex, myDailyPlans?.items?.length, sortedPlans]
	);
	const previousPlan = useMemo(
		() => (currentPlanIndex > 0 ? sortedPlans[currentPlanIndex - 1] : null),
		[currentPlanIndex, sortedPlans]
	);

	// Memoize today, tomorrow, and future plans
	const todayPlan = useMemo(
		() => myDailyPlans?.items?.find((plan: TDailyPlan) => isSameDate(plan.date, moment().toDate())),
		[isSameDate, myDailyPlans?.items]
	);

	const tomorrowPlan = useMemo(
		() => myDailyPlans?.items?.find((plan: TDailyPlan) => isSameDate(plan.date, moment().add(1, 'days').toDate())),
		[isSameDate, myDailyPlans?.items]
	);

	const selectedPlan = useMemo(
		() =>
			customDate &&
			myDailyPlans?.items?.find((plan: TDailyPlan) => {
				return isSameDate(plan.date.toString().split('T')[0], customDate.setHours(0, 0, 0, 0));
			}),
		[customDate, myDailyPlans?.items, isSameDate]
	);

	// Handle modal close
	const handleCloseModal = useCallback(() => {
		closeModal();
	}, [closeModal]);

	// Define tabs for plan selection
	const tabs: TCalendarTab[] = useMemo(() => ['Today', 'Tomorrow', 'Calendar'], []);

	// State to track the active tab
	const [selectedTab, setSelectedTab] = useState(tabs[0]);

	// Handle tab switching
	const handleTabClick = (tab: TCalendarTab) => {
		if (tab === 'Today') {
			setCustomDate(moment().toDate());
			setNavigationMode('PLAN');
		} else if (tab === 'Tomorrow') {
			setCustomDate(moment().add(1, 'days').toDate());
			setNavigationMode('PLAN');
		}
		setSelectedTab(tab);
		setShowCalendar(tab === 'Calendar');
		setShowCustomPlan(false);

		if (tab === 'Calendar') {
			setNavigationMode('DATE');
		}
	};

	// Determine which plan to display based on the selected tab
	const plan = useMemo(() => {
		switch (selectedTab) {
			case 'Today':
				return todayPlan;
			case 'Tomorrow':
				return tomorrowPlan;
			case 'Calendar':
				return selectedPlan;
			default:
				return undefined;
		}
	}, [selectedTab, todayPlan, tomorrowPlan, selectedPlan]);

	const { user } = useAuthenticateUser();
	const { createDailyPlan, createDailyPlanLoading } = useDailyPlan();

	// Set the related tab for today and tomorrow dates
	const handleCalendarSelect = useCallback(() => {
		if (customDate) {
			if (isSameDate(customDate, moment().startOf('day').toDate())) {
				setSelectedTab('Today');
				setCustomDate(moment().toDate());
			} else if (isSameDate(customDate, moment().add(1, 'days').startOf('day').toDate())) {
				setSelectedTab('Tomorrow');
				setCustomDate(moment().add(1, 'days').toDate());
			} else {
				setShowCalendar(false);
				setShowCustomPlan(true);
			}

			setNavigationMode('PLAN');
		}
	}, [customDate, isSameDate]);

	const createEmptyPlan = useCallback(async () => {
		try {
			await createDailyPlan({
				workTimePlanned: 0,
				date: String(new Date(moment(customDate).format('YYYY-MM-DD'))),
				status: EDailyPlanStatus.OPEN,
				tenantId: user?.tenantId ?? '',
				employeeId: user?.employee?.id,
				organizationId: user?.employee?.organizationId!
			});

			handleCalendarSelect();
		} catch (error) {
			console.log(error);
		}
	}, [
		createDailyPlan,
		customDate,
		handleCalendarSelect,
		user?.employee?.id,
		user?.employee?.organizationId,
		user?.tenantId
	]);

	// Handle narrow navigation
	const arrowNavigationHandler = useCallback(
		async (date: Date) => {
			const existPlan = myDailyPlans?.items?.find((plan: TDailyPlan) => {
				return isSameDate(plan.date.toString().split('T')[0], date.setHours(0, 0, 0, 0));
			});

			setCustomDate(date);

			if (selectedPlan) {
				if (isSameDate(date, moment().startOf('day').toDate())) {
					navigationMode == 'PLAN' && setSelectedTab('Today');
				} else if (isSameDate(date, moment().add(1, 'days').startOf('day').toDate())) {
					navigationMode == 'PLAN' && setSelectedTab('Tomorrow');
				} else {
					setSelectedTab('Calendar');
					if (existPlan && navigationMode == 'PLAN') {
						setShowCalendar(false);
						setShowCustomPlan(true);
					} else {
						setCustomDate(date);
						setShowCalendar(true);
						setShowCustomPlan(false);
					}
				}
			}
		},
		[isSameDate, myDailyPlans?.items, navigationMode, selectedPlan]
	);

	// Handle navigation  between plans
	const moveBetweenPlans = useCallback(
		(direction: boolean) => {
			if (direction) {
				// Select the next plan
				if (nextPlan) {
					setCustomDate(moment(nextPlan.date).toDate());
					setSelectedTab('Calendar');
					setShowCalendar(false);
					setShowCustomPlan(true);
				}
			} else {
				// Select the previous plan
				if (previousPlan) {
					setCustomDate(moment(previousPlan.date).toDate());
					setSelectedTab('Calendar');
					setShowCalendar(false);
					setShowCustomPlan(true);
				}
			}
		},
		[nextPlan, previousPlan]
	);

	// A handler function to display the plan title
	const displayPlanTitle = (selectedTab: TCalendarTab, selectedPlan?: TDailyPlan) => {
		const isCalendarTab = selectedTab === 'Calendar';
		const planDate = selectedPlan?.date ? new Date(selectedPlan.date).toLocaleDateString('en-GB') : '';
		const hasTasks = selectedPlan?.tasks?.length;
		const isTodayOrTomorrow =
			selectedTab === 'Today'
				? t('common.plan.FOR_TODAY')
				: selectedTab === 'Tomorrow'
					? t('common.plan.FOR_TOMORROW')
					: '';

		return isCalendarTab
			? showCustomPlan && selectedPlan
				? hasTasks
					? t('common.plan.FOR_DATE', { date: planDate })
					: planDate
				: t('common.plan.PLURAL')
			: isTodayOrTomorrow;
	};

	return (
		<Modal
			isOpen={isOpen}
			customCloseModal={handleCloseModal}
			closeModal={() => null}
			className={clsxm('w-[36rem]')}
		>
			<EverCard className="w-full h-full overflow-hidden" shadow="custom">
				<div className="flex flex-col w-full gap-3 ">
					<div className="relative flex items-center justify-center w-full h-12">
						{selectedTab === 'Calendar' && showCustomPlan && (
							<Tooltip label="Go back to the calendar">
								<button
									onClick={() => {
										setShowCustomPlan(false);
										setShowCalendar(true);
									}}
									className="absolute left-0 flex items-center gap-3 -translate-y-1/2 top-1/2"
								>
									<span className="rotate-180">
										<ChevronRightIcon className="w-4  h-4 stroke-[#B1AEBC]" />
									</span>
									<span>{t('common.BACK')}</span>
								</button>
							</Tooltip>
						)}

						<Text.Heading as="h3" className="text-center uppercase">
							{displayPlanTitle(selectedTab, selectedPlan)}
						</Text.Heading>
					</div>
					<div className="flex items-center justify-between w-full h-12">
						<ul className="flex items-center w-full gap-3">
							{tabs.map((tab, index) => (
								<li
									key={index}
									className={`flex justify-center gap-4 items-center hover:text-primary cursor-pointer ${selectedTab === tab ? 'text-primary font-medium' : ''}`}
									onClick={() => handleTabClick(tab)}
								>
									<span>
										{tab === 'Today'
											? t('common.TODAY')
											: tab === 'Tomorrow'
												? t('common.TOMORROW')
												: t('common.CALENDAR')}
									</span>
									{index + 1 < tabs.length && <VerticalSeparator className="w-full" />}
								</li>
							))}
						</ul>
						<div className="flex items-center justify-between h-8 border rounded ">
							<span
								onClick={() =>
									navigationMode === 'DATE'
										? arrowNavigationHandler(moment(customDate).subtract(1, 'days').toDate())
										: moveBetweenPlans(false)
								}
								className="flex items-center justify-center h-full px-2 rotate-180 cursor-pointer"
							>
								<ChevronRightIcon className="w-6  h-4 stroke-[#B1AEBC]" />
							</span>
							<VerticalSeparator />
							<span
								onClick={() =>
									navigationMode === 'DATE'
										? arrowNavigationHandler(moment(customDate).add(1, 'days').toDate())
										: moveBetweenPlans(true)
								}
								className="flex items-center justify-center h-full px-2 cursor-pointer "
							>
								<ChevronRightIcon className="w-6  h-4 stroke-[#B1AEBC]" />
							</span>
						</div>
					</div>

					<div className="w-full flex flex-col items-center h-[34rem]">
						{selectedTab === 'Calendar' && showCalendar ? (
							<div className="flex flex-col items-center justify-between w-full h-full">
								<div className="w-full grow">
									<div className="flex flex-col items-center justify-center w-full h-full gap-4">
										<p className="text-sm font-medium ">{t('common.plan.CHOOSE_DATE')}</p>
										<div className="flex items-center justify-center p-3 border rounded-md">
											<FuturePlansCalendar
												selectedPlan={customDate}
												setSelectedPlan={setCustomDate}
												plans={myDailyPlans?.items}
												pastPlans={pastPlans}
												handleCalendarSelect={handleCalendarSelect}
												createEmptyPlan={createEmptyPlan}
											/>
										</div>
									</div>
								</div>

								<div className="flex items-center justify-between w-full h-14">
									<Button
										variant="outline"
										type="submit"
										className="py-3 px-5 min-w-[8rem] rounded-md font-light text-md dark:text-white dark:bg-slate-700 dark:border-slate-600"
										onClick={handleCloseModal}
									>
										{t('common.CANCEL')}
									</Button>
									<Button
										disabled={!customDate || createDailyPlanLoading}
										variant="default"
										type="submit"
										className={clsxm(
											'py-3 min-w-[8rem] px-5 rounded-md font-light text-md dark:text-white'
										)}
										onClick={selectedPlan ? handleCalendarSelect : createEmptyPlan}
									>
										{selectedPlan ? (
											t('common.SELECT')
										) : createDailyPlanLoading ? (
											<SpinnerLoader variant="light" size={20} />
										) : (
											t('common.plan.ADD_PLAN')
										)}
									</Button>
								</div>
							</div>
						) : (
							<>
								{selectedPlan ? (
									<AddTasksEstimationHoursModal
										plan={plan}
										tasks={(plan?.tasks as ITask[]) ?? []}
										isRenderedInSoftFlow={false}
										isOpen={isOpen}
										closeModal={handleCloseModal}
										selectedDate={customDate}
									/>
								) : customDate ? (
									<AddTasksEstimationHoursModal
										tasks={[]}
										isRenderedInSoftFlow={false}
										isOpen={isOpen}
										closeModal={handleCloseModal}
										selectedDate={customDate}
									/>
								) : (
									<div className="flex items-center justify-center h-full">
										<NoData component={<ValueNoneIcon />} text={t('common.plan.PLAN_NOT_FOUND')} />
									</div>
								)}
							</>
						)}
					</div>
				</div>
			</EverCard>
		</Modal>
	);
});

/**
 * -------------------------------------------------------
 * 		----------------- Calendar ------------------
 * -------------------------------------------------------
 */

interface ICalendarProps {
	setSelectedPlan: Dispatch<SetStateAction<Date>>;
	selectedPlan: Date | undefined;
	plans: TDailyPlan[];
	pastPlans: TDailyPlan[];
	handleCalendarSelect: () => void;
	createEmptyPlan: () => Promise<void>;
}

/**
 * The component that handles the selection of a plan
 *
 * @param {Object} props - The props object
 * @param {Dispatch<SetStateAction<TDailyPlan>>} props.setSelectedPlan - A function that set the selected plan
 * @param {TDailyPlan} props.selectedPlan - The selected plan
 * @param {TDailyPlan[]} props.plans - Available plans
 * @param {TDailyPlan[]} props.pastPlans - Past plans
 * @param {() => void} props.handleCalendarSelect - Handle plan selection
 * @param {() => Promise<void>} props.createEmptyPlan - Create empty plan
 *
 * @returns {JSX.Element} The Calendar component.
 */
const FuturePlansCalendar = memo(function FuturePlansCalendar(props: ICalendarProps) {
	const { selectedPlan, setSelectedPlan, plans, pastPlans, createEmptyPlan, handleCalendarSelect } = props;
	const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const clickCountRef = useRef<number>(0);

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
				.map((plan) => {
					return moment(plan.date.toString().split('T')[0]).toISOString().split('T')[0];
				})
				.some((date) => {
					return date === moment(dateToCheck).toISOString().split('T')[0];
				});
		},
		[plans]
	);

	/**
	 * onDayClick handler - A function that handles clicks on a day (date)
	 *
	 * @param {Date} day - The clicked date
	 * @param {ActiveModifiers} activeModifiers - The active modifiers
	 * @param {React.MouseEvent} e - The event
	 *
	 * @returns {void} Nothing
	 */
	const handleDayClick = useCallback(
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		(day: Date, activeModifiers: ActiveModifiers, e: React.MouseEvent) => {
			if (activeModifiers.disabled) return;

			clickCountRef.current += 1;

			if (clickCountRef.current === 1) {
				clickTimeoutRef.current = setTimeout(() => {
					// Single click
					clickCountRef.current = 0;
				}, 300);
			} else if (clickCountRef.current === 2) {
				if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
				// Double click
				if (selectedPlan) {
					handleCalendarSelect();
				} else {
					setSelectedPlan(moment(day).toDate());
					createEmptyPlan();
				}
				clickCountRef.current = 0;
			}
		},
		[createEmptyPlan, handleCalendarSelect, selectedPlan, setSelectedPlan]
	);

	return (
		<Calendar
			mode="single"
			onDayClick={handleDayClick}
			captionLayout="dropdown"
			selected={selectedPlan ? selectedPlan : undefined}
			onSelect={(date: Date | undefined) => {
				if (date) {
					setSelectedPlan(moment(date).toDate());
				}
			}}
			initialFocus
			disabled={(date: Date) => {
				return checkPastDate(date) && isDateUnplanned(date);
			}}
			modifiers={{
				booked: sortedPlans?.map((plan) => moment.utc(plan.date.toString().split('T')[0]).toDate()),
				pastDay: pastPlans?.map((plan) => moment.utc(plan.date.toString().split('T')[0]).toDate())
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
