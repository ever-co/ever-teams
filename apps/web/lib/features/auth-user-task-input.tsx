import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { useTranslation } from 'lib/i18n';
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
	return (
		<div
			className={clsxm('flex-1 flex flex-col mr-10 lg:mt-0 mt-8', className)}
		>
			<TaskInput
				fullWidthCombobox={true}
				createOnEnterClick={true}
				showTaskNumber={true}
			/>

			<div className="flex flex-col lg:flex-row justify-between lg:items-center space-x-3">
				<div className="flex space-x-3 lg:mb-0 mb-4">
					<span className="text-gray-500 font-normal">
						{trans.common.ESTIMATE}:
					</span>
					<TaskEstimate />
				</div>

				<div className="flex-1 md:flex md:justify-between md:space-x-3 justify-center hidden">
					<ActiveTaskStatusDropdown className="lg:min-w-[170px]" />

					<ActiveTaskPropertiesDropdown className="lg:min-w-[170px]" />

					<ActiveTaskSizesDropdown className="lg:min-w-[170px]" />

					<ActiveTaskLabelsDropdown className="lg:min-w-[170px]" />
				</div>
				<div className="grid justify-items-center md:hidden">
					<div className='flex'>
						<ActiveTaskStatusDropdown className="w-32 mr-2" />
						<ActiveTaskPropertiesDropdown className="w-32" />
					</div>
					<div  className='flex mt-2'>
						<ActiveTaskSizesDropdown className="w-32 mr-2" />
						<ActiveTaskLabelsDropdown className="w-32" />
					</div>
				</div>
			</div>
		</div>
	);
}
