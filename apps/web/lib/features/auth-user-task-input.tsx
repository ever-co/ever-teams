// import { useOrganizationTeams } from '@app/hooks';
import { useOrganizationTeams } from '@app/hooks';
import { IClassName } from '@app/interfaces';
import { activeTeamTaskState } from '@app/stores';
import { clsxm } from '@app/utils';
import { useRecoilValue } from 'recoil';
import { TaskEstimate } from './task/task-estimate';
import { TaskInput } from './task/task-input';
import { TaskLabels } from './task/task-labels';
import { ActiveTaskPropertiesDropdown, ActiveTaskSizesDropdown, ActiveTaskStatusDropdown } from './task/task-status';
import { useTranslations } from 'next-intl';

export function AuthUserTaskInput({ className }: IClassName) {
	const t = useTranslations();
	const activeTeamTask = useRecoilValue(activeTeamTaskState);
	const { isTrackingEnabled } = useOrganizationTeams();

	return (
		<div className={clsxm('flex-1 flex flex-col mr-10 lg:mt-0 mt-8', className)}>
			<TaskInput
				fullWidthCombobox={true}
				createOnEnterClick={true}
				showTaskNumber={true}
				autoAssignTaskAuth={isTrackingEnabled}
			/>
			<div className="flex gap-5 flex-row lg:items-center  ml-2">
				<div className="xl:flex mb-4 lg:mb-0">
					<span className="font-normal  text-gray-500 pr-2">{t('common.ESTIMATE')}:</span>
					<TaskEstimate />
				</div>

				<div className="flex-grow  flex-1 hidden gap-2 md:flex">
					<ActiveTaskStatusDropdown
						className=" lg:max-w-[190px] w-full"
						disabled={!activeTeamTask}
						taskStatusClassName=" text-xs py-2.5 w-full"
					/>

					<ActiveTaskPropertiesDropdown
						className="lg:max-w-[190px] w-full"
						disabled={!activeTeamTask}
						taskStatusClassName="py-2.5 w-full text-xs"
					/>

					<ActiveTaskSizesDropdown
						className="lg:max-w-[190px] w-full"
						disabled={!activeTeamTask}
						taskStatusClassName="py-2.5 w-full text-xs"
					/>

					<TaskLabels
						task={activeTeamTask}
						className="lg:max-w-[190px] w-full text-xs"
						forDetails={false}
						taskStatusClassName="dark:bg-[#1B1D22] py-2.5 dark:border dark:border-[#FFFFFF33] text-xs"
					/>
				</div>
				{/* <div className="grid justify-items-center md:hidden">
					<div className="flex">
						<ActiveTaskStatusDropdown className="w-32 mr-2" disabled={!activeTeamTask} />
						<ActiveTaskPropertiesDropdown className="w-32" disabled={!activeTeamTask} />
					</div>
					<div className="flex mt-2">
						<ActiveTaskSizesDropdown className="w-32 mr-2" disabled={!activeTeamTask} />
						<TaskLabels task={activeTeamTask} className="lg:min-w-[170px]" forDetails={false} />
					</div>
				</div> */}
			</div>
		</div>
	);
}
