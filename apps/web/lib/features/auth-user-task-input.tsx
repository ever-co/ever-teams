// import { useOrganizationTeams } from '@app/hooks';
import { useOrganizationTeams } from '@app/hooks';
import { IClassName } from '@app/interfaces';
import { activeTeamTaskState } from '@app/stores';
import { clsxm } from '@app/utils';
import { useTranslation } from 'react-i18next';
import { useRecoilValue } from 'recoil';
import { TaskEstimate } from './task/task-estimate';
import { TaskInput } from './task/task-input';
import { TaskLabels } from './task/task-labels';
import { ActiveTaskPropertiesDropdown, ActiveTaskSizesDropdown, ActiveTaskStatusDropdown } from './task/task-status';

export function AuthUserTaskInput({ className }: IClassName) {
	const { t } = useTranslation();
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

			<div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
				<div className="flex mb-4 lg:mb-0">
					<span className="font-normal text-gray-500">{t('common.ESTIMATE')}:</span>
					<TaskEstimate />
				</div>

				<div className="justify-end flex-1 hidden gap-2 md:flex">
					<ActiveTaskStatusDropdown
						className="lg:min-w-[170px]"
						disabled={!activeTeamTask}
						taskStatusClassName="h-7 text-xs"
					/>

					<ActiveTaskPropertiesDropdown
						className="lg:min-w-[170px]"
						disabled={!activeTeamTask}
						taskStatusClassName="h-7 text-xs"
					/>

					<ActiveTaskSizesDropdown
						className="lg:min-w-[170px]"
						disabled={!activeTeamTask}
						taskStatusClassName="h-7 text-xs"
					/>

					<TaskLabels
						task={activeTeamTask}
						className="lg:min-w-[170px] text-xs"
						forDetails={false}
						taskStatusClassName="dark:bg-[#1B1D22] dark:border dark:border-[#FFFFFF33] h-7 text-xs"
					/>
				</div>
				<div className="grid justify-items-center md:hidden">
					<div className="flex">
						<ActiveTaskStatusDropdown className="w-32 mr-2" disabled={!activeTeamTask} />
						<ActiveTaskPropertiesDropdown className="w-32" disabled={!activeTeamTask} />
					</div>
					<div className="flex mt-2">
						<ActiveTaskSizesDropdown className="w-32 mr-2" disabled={!activeTeamTask} />
						<TaskLabels task={activeTeamTask} className="lg:min-w-[170px]" forDetails={false} />
					</div>
				</div>
			</div>
		</div>
	);
}
