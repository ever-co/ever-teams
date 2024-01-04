import StatusDropdown from '@components/shared/tasks/status-dropdown';
import { useTranslations } from 'next-intl';
import { Dispatch, SetStateAction } from 'react';

export type IProfileTabs = 'worked' | 'assigned' | 'unassigned';

export function ProfileTabs({ tab, setTab }: { tab: IProfileTabs; setTab: Dispatch<SetStateAction<IProfileTabs>> }) {
	const t = useTranslations();
	return (
		<div className="my-[41px] text-[18px] text-[#ACB3BB] font-light flex justify-between items-center w-full">
			<div className="flex">
				<div
					className={`mr-10 ${tab === 'worked' && 'font-medium'} cursor-pointer`}
					onClick={() => setTab('worked')}
				>
					{t('task.taskLabel.WORK_LABEL')}
					{tab === 'worked' && <div className="w-[65px] h-[2px] bg-[#ACB3BB]" />}
				</div>
				<div
					className={`mr-10 ${tab === 'assigned' && 'font-medium'} cursor-pointer`}
					onClick={() => setTab('assigned')}
				>
					{t('task.taskLabel.TASK_ASSIGNED')}
					{tab === 'assigned' && <div className="w-[78px] h-[2px] bg-[#ACB3BB]" />}
				</div>
				<div
					className={`mr-10 ${tab === 'unassigned' && 'font-medium'} cursor-pointer`}
					onClick={() => setTab('unassigned')}
				>
					{t('task.taskLabel.TASK_UNASSIGNED')}
					{tab === 'unassigned' && <div className="w-[98px] h-[2px] bg-[#ACB3BB]" />}
				</div>
			</div>
			<div className="flex items-center">
				<div className="relative z-10 h-full mr-4">
					<StatusDropdown />
				</div>
				<button className="rounded-[7px] hover:bg-opacity-80 w-[140px] text-md h-[36px] bg-primary text-white dark:bg-[#1B1B1E] dark:text-[#ACB3BB] dark:border-white dark:hover:text-white">
					{t('task.taskLabel.BUTTON_LABEL')}
				</button>
			</div>
		</div>
	);
}
