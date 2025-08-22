import { formatDayPlanDate } from '@/core/lib/helpers/index';
import { useDailyPlan } from '@/core/hooks';
import { employeePlansListState } from '@/core/stores';
import { cn } from '@/core/lib/helpers';
import { CircleIcon } from 'assets/svg';
import { PropsWithChildren, useEffect, useState } from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Tooltip } from '../../duplicated-components/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '../../common/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '../../common/command';
import { Button } from '../../common/button';
import { isEqual } from 'lodash';
import { useAtomValue } from 'jotai';

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
			className={cn(
				'bg-[#F2F2F2] dark:bg-dark--theme-light rounded-xl text-xs px-3 py-1 flex items-center justify-between w-full min-w-[190px]'
			)}
		>
			<div
				className={cn(
					'flex items-center space-x-2 text-gray-700 whitespace-nowrap text-ellipsis dark:text-gray-200'
				)}
			>
				{checked ? (
					<Check className="w-4 h-4 text-gray-700 dark:text-white" />
				) : (
					<>{showIcon && active && icon}</>
				)}
				<div className="text-sm font-normal text-gray-400 dark:text-gray-300">{label}</div>
			</div>
			{children}
		</div>
	);
}

export function DailyPlanFilter({ employeeId }: { employeeId: string }) {
	const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
	const employeePlans = useAtomValue(employeePlansListState);

	const { getEmployeeDayPlans, setProfileDailyPlans } = useDailyPlan();
	const filteredPlans = employeePlans;
	const [open, setOpen] = useState(false);

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

			// Only update if the items have changed - use efficient deep comparison
			if (!isEqual(filtered, prevState.items)) {
				return { ...prevState, items: filtered };
			}
			return prevState;
		});
	}, [employeePlans, selectedPlans, setProfileDailyPlans]);

	const togglePlanSelection = (planDate: string) => {
		setSelectedPlans((current) => {
			if (current.includes(planDate)) {
				return current.filter((date) => date !== planDate);
			} else {
				return [...current, planDate];
			}
		});
	};

	return (
		<Tooltip label="Select plan to filter" placement="auto" enabled={false}>
			<div className="relative">
				<Popover open={open} onOpenChange={setOpen}>
					<PopoverTrigger asChild>
						<Button
							variant="ghost"
							className="p-0 h-auto w-full max-w-[190px] outline-none hover:bg-transparent focus:bg-transparent"
						>
							<DailyPlanDropDownItem
								label={selectedPlans.length > 0 ? `Items(${selectedPlans.length})` : 'Plans'}
								icon={
									<span>
										<CircleIcon className="w-4 h-4" />
									</span>
								}
								active={true}
							>
								{open ? (
									<ChevronUp className="w-4 h-4 text-gray-400 dark:text-gray-500" />
								) : (
									<ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
								)}
							</DailyPlanDropDownItem>
						</Button>
					</PopoverTrigger>
					<PopoverContent
						className="p-0 min-w-[220px] border-none shadow-md dark:shadow-lg dark:bg-[#1B1D22] dark:border dark:border-[#FFFFFF33]"
						align="center"
						sideOffset={5}
					>
						<Command className="rounded-lg overflow-hidden dark:bg-[#1B1D22]">
							<CommandList className="max-h-[300px] overflow-auto dark:bg-[#1B1D22]">
								<CommandEmpty className="dark:text-gray-300">No plans found.</CommandEmpty>
								<CommandGroup className="dark:text-white">
									{filteredPlans.map((item) => (
										<CommandItem
											key={item.id}
											onSelect={() => togglePlanSelection(item.date.toString())}
											className="flex items-center gap-2 cursor-pointer data-[selected=true]:bg-accent dark:data-[selected=true]:bg-gray-700 dark:hover:bg-gray-800 dark:text-white whitespace-nowrap text-ellipsis"
										>
											<div className="flex flex-1 items-center whitespace-nowrap text-ellipsis">
												{selectedPlans?.includes(item.date.toString()) && (
													<Check className="mr-2 w-4 h-4 text-primary dark:text-white" />
												)}
												<span className="text-sm text-gray-600 dark:text-gray-300">
													{formatDayPlanDate(item.date.toString())}
												</span>
											</div>
										</CommandItem>
									))}
								</CommandGroup>
							</CommandList>
						</Command>
					</PopoverContent>
				</Popover>
			</div>
		</Tooltip>
	);
}
