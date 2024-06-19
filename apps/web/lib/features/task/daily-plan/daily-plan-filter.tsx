import { formatDayPlanDate } from '@app/helpers';
import { IDailyPlan } from '@app/interfaces';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger
} from '@components/ui/dropdown-menu';
export function DailyPlanFilter({ dailyPlans }: { dailyPlans: IDailyPlan[] }) {
	const filteredPlans = dailyPlans.filter((plan) => {
		const planDate = new Date(plan.date);
		const today = new Date();
		today.setHours(23, 59, 59, 0); // Set today time to exclude timestamps in comparization
		return (
			planDate.getTime() >= today.getTime() ||
			plan.date?.toString()?.startsWith(new Date()?.toISOString().split('T')[0])
		);
	});

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<p className="text-dark dark:text-white dark:bg-dark--theme-light border-none font-light text-start w-full max-w-[190px] px-3 py-2 h-9 rounded-xl pt-1 cursor-pointer">
					Plans
				</p>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-max border-none dark:bg-dark--theme-light flex flex-col gap-1">
				{filteredPlans.map((plan) => (
					<DropdownMenuCheckboxItem
						key={plan.date.toString()}
						className="dark:bg-dark--theme-light border dark:border-slate-700"
					>
						{formatDayPlanDate(plan.date.toString())}
					</DropdownMenuCheckboxItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
