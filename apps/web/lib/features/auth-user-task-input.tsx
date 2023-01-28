import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { TaskEstimate } from './task/task-estimate';
import { TaskInput } from './task/task-input';
import {
	ActiveTaskStatusDropdown,
	TaskDevicesDropdown,
	TaskPropertiesDropdown,
	TaskSizesDropdown,
} from './task/task-status';

export function AuthUserTaskInput({ className }: IClassName) {
	return (
		<div
			className={clsxm('flex-1 flex flex-col mr-10 lg:mt-0 mt-8', className)}
		>
			<TaskInput />

			<div className="flex flex-col lg:flex-row justify-between items-center space-x-3">
				<div className="flex space-x-3 lg:mb-0 mb-4">
					<span className="text-gray-500 font-normal">Estimate:</span>
					<TaskEstimate />
				</div>

				<div className="flex-1 flex justify-between space-x-3">
					<ActiveTaskStatusDropdown className="lg:min-w-[170px]" />

					<TaskPropertiesDropdown className="lg:min-w-[170px]" />
					<TaskSizesDropdown className="lg:min-w-[170px]" />
					<TaskDevicesDropdown className="lg:min-w-[170px]" />
				</div>
			</div>
		</div>
	);
}
