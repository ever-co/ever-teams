import { formatDayPlanDate } from '@app/helpers';
import { useDailyPlan } from '@app/hooks';
import { clsxm } from '@app/utils';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { CircleIcon } from 'assets/svg';
import { Card, Tooltip } from 'lib/components';
import { PropsWithChildren, useEffect, useState } from 'react';

export function DailyPlanDropDownItem({
	children,
	label,
	active = true,
	checked = false,
	showIcon = true,
	icon
}: PropsWithChildren<{
	label: string;
	active?: boolean;
	checked?: boolean;
	showIcon?: boolean;
	icon?: React.ReactNode;
}>) {
	return (
		<div
			className={clsxm(
				'bg-gray-200 dark:bg-dark--theme-light rounded-xl px-3 py-1 flex items-center justify-between w-full min-w-[170px]'
			)}
		>
			<div className={clsxm('flex items-center space-x-1 whitespace-nowrap text-ellipsis dark:text-white')}>
				{checked ? (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						width="20px"
						height="20px"
						className={`dark:fill-white`}
					>
						<path d="M9 19.4L3.3 13.7 4.7 12.3 9 16.6 20.3 5.3 21.7 6.7z" />
					</svg>
				) : (
					<>{showIcon && active && icon}</>
				)}
				<div className={`capitalize text-ellipsis`}>{label}</div>
			</div>
			{children}
		</div>
	);
}

export function DailyPlanFilter({ employeeId }: { employeeId: string }) {
	const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
	const { employeePlans, getEmployeeDayPlans, setProfileDailyPlans } = useDailyPlan();
	const filteredPlans = employeePlans;

	useEffect(() => {
		if (selectedPlans.length === 0) {
			getEmployeeDayPlans(employeeId);
		}
	}, [selectedPlans, getEmployeeDayPlans, employeeId]);

	useEffect(() => {
		setProfileDailyPlans((prevState) => {
			const filtered = employeePlans.filter((plan) =>
				selectedPlans.length > 0 ? selectedPlans.includes(plan.date.toString()) : true
			);

			// Only update if the items have changed
			if (JSON.stringify(filtered) !== JSON.stringify(employeePlans)) {
				return { ...prevState, items: filtered };
			}
			return prevState;
		});
	}, [employeePlans, selectedPlans, setProfileDailyPlans]);

	return (
		<Tooltip label="Select plan to filter" placement="auto" enabled={false}>
			<div className="relative">
				<Listbox value={selectedPlans} onChange={setSelectedPlans} multiple>
					{({ open }) => {
						return (
							<>
								<Listbox.Button as="div" className="w-full max-w-[190px] cursor-pointer outline-none">
									<DailyPlanDropDownItem
										label={selectedPlans.length > 0 ? `Items(${selectedPlans.length})` : 'Plans'}
										icon={
											<span>
												<CircleIcon className="h-4 w-4" />
											</span>
										}
										active={true}
									>
										<ChevronDownIcon className={clsxm('h-5 w-5 text-default dark:text-white')} />
									</DailyPlanDropDownItem>
								</Listbox.Button>

								<Transition
									as="div"
									show={open}
									enter="transition duration-100 ease-out"
									enterFrom="transform scale-95 opacity-0"
									enterTo="transform scale-100 opacity-100"
									leave="transition duration-75 ease-out"
									leaveFrom="transform scale-100 opacity-100"
									leaveTo="transform scale-95 opacity-0"
								>
									<div className={clsxm('absolute right-0 left-0 z-40 min-w-min outline-none')}>
										<Listbox.Options className="outline-none ">
											<Card
												shadow="bigger"
												className="p-4 md:p-4 shadow-xlcard dark:shadow-lgcard-white dark:bg-[#1B1D22] dark:border dark:border-[#FFFFFF33] flex flex-col gap-2.5 absolute max-h-80 overflow-y-auto no-scrollbar"
											>
												{filteredPlans.map((item) => (
													<Listbox.Option key={item.id} value={item.date.toString()} as="div">
														<li className="cursor-pointer outline-none relative">
															<DailyPlanDropDownItem
																label={formatDayPlanDate(item.date.toString())}
																checked={selectedPlans?.includes(item.date.toString())}
															/>
														</li>
													</Listbox.Option>
												))}
											</Card>
										</Listbox.Options>
									</div>
								</Transition>
							</>
						);
					}}
				</Listbox>
			</div>
		</Tooltip>
	);
}
