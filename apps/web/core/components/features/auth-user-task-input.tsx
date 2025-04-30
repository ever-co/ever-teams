// import { useOrganizationTeams } from '@app/hooks';
import { useOrganizationTeams } from '@/core/hooks';
import { IClassName } from '@/core/types/interfaces';
import { activeTeamTaskState } from '@/core/stores';
import { clsxm } from '@/core/lib/utils';
import { useAtomValue } from 'jotai';
import { TaskEstimate } from './task/task-estimate';
import { TaskInput } from './task/task-input';
import { TaskLabels } from './task/task-labels';
import { ActiveTaskPropertiesDropdown, ActiveTaskSizesDropdown, ActiveTaskStatusDropdown } from './task/task-status';
import { useTranslations } from 'next-intl';
import { ProjectDropDown } from '@/core/components/pages/task/details-section/blocks/task-secondary-info';

export function AuthUserTaskInput({ className }: IClassName) {
	const t = useTranslations();
	const activeTeamTask = useAtomValue(activeTeamTaskState);
	const { isTrackingEnabled } = useOrganizationTeams();

	return (
		<div className={clsxm('flex flex-col flex-1 mt-8 mr-10 lg:mt-0', className)}>
			<TaskInput
				fullWidthCombobox={true}
				createOnEnterClick={true}
				showTaskNumber={true}
				autoAssignTaskAuth={isTrackingEnabled}
			/>
			<div className="flex flex-row gap-5 justify-between ml-2 lg:items-center">
				<div className="mb-4 xl:flex lg:mb-0">
					<span className="pr-2 font-normal text-gray-500">{t('common.ESTIMATE')}:</span>
					<TaskEstimate />
				</div>

				<div className="hidden flex-1 flex-grow gap-2 justify-end md:flex">
					<ActiveTaskStatusDropdown
						className="lg:max-w-[190px] grow dark:text-white dark:border-white"
						disabled={!activeTeamTask}
						taskStatusClassName="text-xs py-1.5 w-full dark:bg-[#1B1D22] dark:border dark:border-[#FFFFFF33] "
					/>

					<ActiveTaskPropertiesDropdown
						className="lg:max-w-[190px] grow dark:text-white dark:border-white"
						disabled={!activeTeamTask}
						taskStatusClassName="w-full py-1.5 text-xs dark:bg-[#1B1D22] dark:border dark:border-[#FFFFFF33]"
					/>

					<ActiveTaskSizesDropdown
						className="lg:max-w-[190px] grow dark:text-white dark:border-white"
						disabled={!activeTeamTask}
						taskStatusClassName="w-full py-1.5 text-xs dark:bg-[#1B1D22] dark:border dark:border-[#FFFFFF33]"
					/>

					<TaskLabels
						task={activeTeamTask}
						className="lg:max-w-[170px] grow text-xs"
						forDetails={false}
						taskStatusClassName="dark:bg-[#1B1D22] text-xs border dark:border-[#fff]"
					/>
					{activeTeamTask && (
						<ProjectDropDown
							styles={{
								container: 'rounded-xl grow text-xs !max-w-[10.625rem]',
								listCard: 'rounded-xl'
							}}
							task={activeTeamTask}
						/>
					)}
				</div>
				{/* <div className="grid justify-items-center md:hidden">
					<div className="flex">
						<ActiveTaskStatusDropdown className="mr-2 w-32" disabled={!activeTeamTask} />
						<ActiveTaskPropertiesDropdown className="w-32" disabled={!activeTeamTask} />
					</div>
					<div className="flex mt-2">
						<ActiveTaskSizesDropdown className="mr-2 w-32" disabled={!activeTeamTask} />
						<TaskLabels task={activeTeamTask} className="lg:min-w-[170px]" forDetails={false} />
					</div>
				</div> */}
			</div>
		</div>
	);
}
