import { useTeamTasks } from '@app/hooks';
import { ITaskStatus } from '@app/interfaces';
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

const TaskSecondaryInfo = () => {
	const [task] = useRecoilState(detailedTaskState);

	const { handleStatusUpdate } = useTeamTasks();

	const handleChange = useCallback(
		(status: ITaskStatus) => {
			handleStatusUpdate(status, 'status', task);
		},
		[task, handleStatusUpdate]
	);

	return (
		<section className="flex flex-col p-[15px]">
			<TaskRow labelTitle="Version" wrapperClassName="mb-3">
				<TaskVersionDropdown
					onValueChange={() => void 0}
					className="lg:min-w-[170px]"
				/>
			</TaskRow>

			<TaskRow labelTitle="Epic" wrapperClassName="mb-3">
				<TaskEpicDropdown
					onValueChange={() => void 0}
					className="lg:min-w-[170px]"
				/>
			</TaskRow>

			<TaskRow labelTitle="Status" wrapperClassName="mb-3">
				<TaskStatusDropdown
					defaultValue={task?.status}
					onValueChange={handleChange}
					className="lg:min-w-[170px]"
				/>
			</TaskRow>

			<TaskRow labelTitle="Label" wrapperClassName="mb-3">
				<TaskLabelsDropdown
					defaultValue={task?.label}
					className="lg:min-w-[170px]"
				/>
			</TaskRow>

			<TaskRow labelTitle="Size" wrapperClassName="mb-3">
				<TaskSizesDropdown
					defaultValue={task?.size}
					className="lg:min-w-[170px]"
				/>
			</TaskRow>

			<TaskRow labelTitle="Priority" wrapperClassName="mb-3">
				<TaskPropertiesDropdown
					defaultValue={task?.property}
					className="lg:min-w-[170px]"
				/>
			</TaskRow>
			<hr className="text-[#F2F2F2] mt-[15px]" />
		</section>
	);
};

export default TaskSecondaryInfo;
