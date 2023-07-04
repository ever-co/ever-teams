import { useTeamTasks } from '@app/hooks';
import {
	ITaskStatus,
	ITaskSize,
	ITaskPriority,
	IVersionProperty,
} from '@app/interfaces';
import { detailedTaskState } from '@app/stores';
import {
	EpicPropertiesDropdown as TaskEpicDropdown,
	TaskLabelsDropdown,
	TaskPropertiesDropdown,
	TaskSizesDropdown,
	TaskStatusDropdown,
	VersionPropertiesDropown as TaskVersionDropdown,
} from 'lib/features';
import { useCallback } from 'react';
import { useRecoilState } from 'recoil';
import TaskRow from '../components/task-row';
import { useTranslation } from 'lib/i18n';

const TaskSecondaryInfo = () => {
	const [task] = useRecoilState(detailedTaskState);
	const { trans } = useTranslation('taskDetails');

	const { handleStatusUpdate } = useTeamTasks();

	const handleChange = useCallback(
		(status: ITaskStatus) => {
			handleStatusUpdate(status, 'status', task);
		},
		[task, handleStatusUpdate]
	);

	const handleSizeChange = useCallback(
		(status: ITaskSize) => {
			handleStatusUpdate(status, 'size', task);
		},
		[task, handleStatusUpdate]
	);

	const handlePriorityChange = useCallback(
		(status: ITaskPriority) => {
			handleStatusUpdate(status, 'priority', task);
		},
		[task, handleStatusUpdate]
	);

	const handleVersionChange = useCallback(
		(status: IVersionProperty) => {
			handleStatusUpdate(status, 'version', task);
		},
		[task, handleStatusUpdate]
	);

	return (
		<section className="flex flex-col p-[15px]">
			<TaskRow labelTitle={trans.VERSION} wrapperClassName="mb-3">
				<TaskVersionDropdown
					onValueChange={handleVersionChange}
					className="lg:min-w-[170px] text-black"
					forDetails={true}
					defaultValue={task?.version}
					sidebarUI={true}
				/>
			</TaskRow>

			<TaskRow labelTitle={trans.EPIC} wrapperClassName="mb-3">
				<TaskEpicDropdown
					onValueChange={() => void 0}
					className="lg:min-w-[170px] text-black"
					forDetails={true}
					sidebarUI={true}
				/>
			</TaskRow>

			<TaskRow labelTitle={trans.STATUS} wrapperClassName="mb-3">
				<TaskStatusDropdown
					defaultValue={task?.status}
					onValueChange={handleChange}
					className="lg:min-w-[170px] text-black"
					forDetails={true}
					sidebarUI={true}
				/>
			</TaskRow>

			<TaskRow labelTitle={trans.LABEL} wrapperClassName="mb-3">
				<TaskLabelsDropdown
					defaultValue={task?.label}
					className="lg:min-w-[170px] text-black"
					forDetails={true}
					sidebarUI={true}
				/>
			</TaskRow>

			<TaskRow labelTitle={trans.SIZE} wrapperClassName="mb-3 text-black">
				<TaskSizesDropdown
					defaultValue={task?.size}
					className="lg:min-w-[170px] text-black"
					forDetails={true}
					largerWidth={true}
					onValueChange={handleSizeChange}
					sidebarUI={true}
				/>
			</TaskRow>

			<TaskRow labelTitle={trans.PRIORITY} wrapperClassName="mb-3 text-black">
				<TaskPropertiesDropdown
					defaultValue={task?.priority}
					className="lg:min-w-[170px] text-black "
					forDetails={true}
					largerWidth={true}
					onValueChange={handlePriorityChange}
					sidebarUI={true}
				/>
			</TaskRow>
			<hr className="text-[#F2F2F2] mt-[15px]" />
		</section>
	);
};

export default TaskSecondaryInfo;
