import StatusDropdown from '@components/shared/tasks/status-dropdown';
import { Dispatch, SetStateAction } from 'react';

export type IProfileTabs = 'worked' | 'assigned' | 'unassigned';

export function ProfileTabs({
	tab,
	setTab
}: {
	tab: IProfileTabs;
	setTab: Dispatch<SetStateAction<IProfileTabs>>;
}) {
	return (
		<div className="my-[41px] text-[18px] text-[#ACB3BB] font-light flex justify-between items-center w-full">
			<div className="flex">
				<div
					className={`mr-10 ${
						tab === 'worked' && 'font-medium'
					} cursor-pointer`}
					onClick={() => setTab('worked')}
				>
					Worked
					{tab === 'worked' && (
						<div className="w-[65px] h-[2px] bg-[#ACB3BB]" />
					)}
				</div>
				<div
					className={`mr-10 ${
						tab === 'assigned' && 'font-medium'
					} cursor-pointer`}
					onClick={() => setTab('assigned')}
				>
					Assigned
					{tab === 'assigned' && (
						<div className="w-[78px] h-[2px] bg-[#ACB3BB]" />
					)}
				</div>
				<div
					className={`mr-10 ${
						tab === 'unassigned' && 'font-medium'
					} cursor-pointer`}
					onClick={() => setTab('unassigned')}
				>
					Unassigned
					{tab === 'unassigned' && (
						<div className="w-[98px] h-[2px] bg-[#ACB3BB]" />
					)}
				</div>
			</div>
			<div className="flex items-center">
				<div className="mr-4 h-full relative z-10">
					<StatusDropdown />
				</div>
				<button className="rounded-[7px] hover:bg-opacity-80 w-[140px] text-md h-[36px] bg-primary text-white dark:bg-[#1B1B1E] dark:text-[#ACB3BB] dark:border-white dark:hover:text-white">
					Assign Task
				</button>
			</div>
		</div>
	);
}
