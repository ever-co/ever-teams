import { Card, Modal, Tooltip, VerticalSeparator } from 'lib/components';
import { memo, useCallback, useMemo, useState } from 'react';
import { clsxm } from '@app/utils';
import { Text } from 'lib/components';
import { ChevronRightIcon } from 'assets/svg';
import { useTranslations } from 'next-intl';
import { CustomCalendar } from './create-daily-plan-form-modal';
import { AddTasksEstimationHoursModal } from './add-task-estimation-hours-modal';
import { useDailyPlan } from '@app/hooks';
import { Button } from '@components/ui/button';

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
	const t = useTranslations();
	const [showCalendar, setShowCalendar] = useState(false);
	const { todayPlan } = useDailyPlan();

	const handleCloseModal = useCallback(() => {
		closeModal();
	}, [closeModal]);

	const tabs = useMemo(
		(): { name: 'Today' | 'Tomorrow' | 'Future' }[] => [
			{
				name: 'Today'
			},
			{
				name: 'Tomorrow'
			},
			{
				name: 'Future'
			}
		],
		[]
	);

	const [selectedTab, setSelectedTab] = useState<{ name: 'Today' | 'Tomorrow' | 'Future' }>(tabs[0]);

	return (
		<Modal isOpen={isOpen} closeModal={handleCloseModal} className={clsxm('w-[36rem]')}>
			<Card className="w-full  h-full overflow-hidden" shadow="custom">
				<div className="w-full flex flex-col gap-3 ">
					<div className="relative w-full h-12  flex items-center justify-center">
						<Tooltip label="Go back to the calendar">
							<button className=" absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-3">
								<span className="rotate-180">
									<ChevronRightIcon className="w-4  h-4 stroke-[#B1AEBC]" />
								</span>
								<span>Back</span>
							</button>
						</Tooltip>
						<Text.Heading as="h3" className="uppercase text-center">
							Plan for 12/04/2024
						</Text.Heading>
					</div>
					<div className="w-full h-12 flex items-center px-3">
						<ul className="w-full flex items-center gap-3">
							{tabs.map((tab, index) => (
								<li
									key={index}
									className={`flex justify-center gap-4 items-center hover:text-primary cursor-pointer ${selectedTab.name === tab.name ? 'text-primary font-medium' : ''}`}
									onClick={() => {
										setSelectedTab(tab);
										if (tab.name == 'Future') {
											setShowCalendar(true);
										} else {
											setShowCalendar(false);
										}
									}}
								>
									<span>{tab.name}</span>
									{index + 1 < tabs.length && <VerticalSeparator className="w-full" />}
								</li>
							))}
						</ul>
					</div>

					<div className="w-full flex   items-center justify-center h-[34rem]">
						{showCalendar ? (
							<div className="w-full h-full flex-col flex items-center justify-between">
								<div className="w-full grow">
									<div className="w-full h-full flex flex-col gap-4 items-center justify-center">
										<p className=" text-sm font-medium">Select a date to be able to see a plan</p>
										<div className="p-3 border flex  items-center  justify-center rounded-md">
											<CustomCalendar
												setDate={() => console.log('first')}
												date={new Date()}
												existingPlanDates={[new Date()]}
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
										variant="default"
										type="submit"
										className={clsxm('py-3 px-5 rounded-md font-light text-md dark:text-white')}
									>
										Select
									</Button>
								</div>
							</div>
						) : (
							<AddTasksEstimationHoursModal
								plan={todayPlan[0]}
								tasks={todayPlan[0]?.tasks ?? []}
								renderInModal={false}
								isOpen={isOpen}
								closeModal={closeModal}
							/>
						)}
					</div>
				</div>
			</Card>
		</Modal>
	);
});
