// import { useOrganizationTeams } from '@app/hooks';
import { IClassName } from '@app/interfaces';
import { activeTeamTaskState } from '@app/stores';
import { clsxm } from '@app/utils';
import { useTranslation } from 'lib/i18n';
import { useRecoilValue } from 'recoil';
import { TaskEstimate } from './task/task-estimate';
import { TaskInput } from './task/task-input';
import {
	ActiveTaskLabelsDropdown,
	ActiveTaskPropertiesDropdown,
	ActiveTaskSizesDropdown,
	ActiveTaskStatusDropdown,
} from './task/task-status';

export function AuthUserTaskInput({ className }: IClassName) {
	const { trans } = useTranslation();
	const activeTeamTask = useRecoilValue(activeTeamTaskState);
	// const { isTrackingEnabled } = useOrganizationTeams(); //<-- In case we want the assignment of member to task be dynamically

	return (
		<div
			className={clsxm('flex-1 flex flex-col mr-10 lg:mt-0 mt-8', className)}
		>
			<TaskInput
				fullWidthCombobox={true}
				createOnEnterClick={true}
				showTaskNumber={true}
				autoAssignTaskAuth={false}
			/>

			<div className="flex flex-col lg:flex-row justify-between lg:items-center space-x-3">
				<div className="flex space-x-3 lg:mb-0 mb-4">
					<span className="text-gray-500 font-normal">
						{trans.common.ESTIMATE}:
					</span>
					<TaskEstimate />
				</div>

				<div className="flex-1 md:flex md:justify-between md:space-x-3 justify-center hidden">
					<ActiveTaskStatusDropdown
						className="lg:min-w-[170px]"
						disabled={!activeTeamTask}
					/>

					<ActiveTaskPropertiesDropdown
						className="lg:min-w-[170px]"
						disabled={!activeTeamTask}
					/>

					<ActiveTaskSizesDropdown
						className="lg:min-w-[170px]"
						disabled={!activeTeamTask}
					/>

					<ActiveTaskLabelsDropdown
						className="lg:min-w-[170px]"
						disabled={!activeTeamTask}
					/>
				</div>
				<div className="grid justify-items-center md:hidden">
					<div className="flex">
						<ActiveTaskStatusDropdown
							className="w-32 mr-2"
							disabled={!activeTeamTask}
						/>
						<ActiveTaskPropertiesDropdown
							className="w-32"
							disabled={!activeTeamTask}
						/>
					</div>
					<div className="flex mt-2">
						<ActiveTaskSizesDropdown
							className="w-32 mr-2"
							disabled={!activeTeamTask}
						/>
						<ActiveTaskLabelsDropdown
							className="w-32"
							disabled={!activeTeamTask}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
