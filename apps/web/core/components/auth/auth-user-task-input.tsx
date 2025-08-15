import { activeTeamTaskState, isTrackingEnabledState } from '@/core/stores';
import { clsxm } from '@/core/lib/utils';
import { useAtomValue } from 'jotai';
import { TaskEstimate } from '../tasks/task-estimate';
import { TaskInput } from '../tasks/task-input';
import { TaskLabels } from '../tasks/task-labels';
import { ActiveTaskPropertiesDropdown, ActiveTaskSizesDropdown, ActiveTaskStatusDropdown } from '../tasks/task-status';
import { useTranslations } from 'next-intl';
import { ProjectDropDown } from '@/core/components/pages/task/details-section/blocks/task-secondary-info';
import { IClassName } from '@/core/types/interfaces/common/class-name';

export function AuthUserTaskInput({ className }: IClassName) {
	const t = useTranslations();
	const activeTeamTask = useAtomValue(activeTeamTaskState);

	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);

	return (
		<div className={clsxm('flex flex-col flex-1 mt-8 lg:mt-0', className)}>
			<TaskInput
				fullWidthCombobox={true}
				createOnEnterClick={true}
				showTaskNumber={true}
				autoAssignTaskAuth={isTrackingEnabled}
			/>
			<div className="flex flex-row gap-3 items-center ml-2 lg:gap-4 md:justify-between lg:justify-start">
				<div className="mb-4 xl:flex lg:mb-0">
					<span className="pr-2 font-normal text-gray-500">{t('common.ESTIMATE')}:</span>
					<TaskEstimate />
				</div>

				<div className="hidden flex-1 gap-2 justify-end md:flex md:items-center">
					<ActiveTaskStatusDropdown
						className="w-fit lg:max-w-[190px] dark:text-white dark:border-gray-800"
						disabled={!activeTeamTask}
						taskStatusClassName="text-xs py-1.5 w-full dark:bg-[#1B1D22] dark:border dark:border-[#FFFFFF33] overflow-hidden text-ellipsis whitespace-nowrap"
					/>

					<ActiveTaskPropertiesDropdown
						className="w-fit lg:max-w-[190px] dark:text-white dark:border-gray-800"
						disabled={!activeTeamTask}
						taskStatusClassName="w-full py-1.5 text-xs dark:bg-[#1B1D22] dark:border dark:border-[#FFFFFF33] overflow-hidden text-ellipsis whitespace-nowrap"
					/>

					<ActiveTaskSizesDropdown
						className="w-fit lg:max-w-[190px] dark:text-white dark:border-gray-800"
						disabled={!activeTeamTask}
						taskStatusClassName="w-full py-1.5 text-xs dark:bg-[#1B1D22] dark:border dark:border-[#FFFFFF33] overflow-hidden text-ellipsis whitespace-nowrap"
					/>

					<TaskLabels
						task={activeTeamTask}
						className="w-fit lg:max-w-[170px] text-xs"
						forDetails={false}
						taskStatusClassName="dark:bg-[#1B1D22] text-xs border dark:border-gray-700 overflow-hidden text-ellipsis whitespace-nowrap"
					/>
					{activeTeamTask && (
						<ProjectDropDown
							styles={{
								container: 'rounded-xl grow text-xs !max-w-fit overflow-hidden',
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
						<TaskLabels task={activeTeamTask} className="min-w-fit lg:max-w-[170px]" forDetails={false} />
					</div>
				</div> */}
			</div>
		</div>
	);
}
