import { useModal, useSyncRef, useTeamTasks } from '@app/hooks';
import { detailedTaskState, taskVersionListState } from '@app/stores';
import {
	ActiveTaskPropertiesDropdown,
	ActiveTaskSizesDropdown,
	ActiveTaskStatusDropdown,
	ActiveTaskVersionDropdown,
	EpicPropertiesDropdown as TaskEpicDropdown,
	TaskLabels,
} from 'lib/features';
import { useCallback, useState } from 'react';
import { useRecoilValue } from 'recoil';
import TaskRow from '../components/task-row';
import { useTranslation } from 'lib/i18n';
import { Button, Card, Modal } from 'lib/components';
import { PlusIcon } from '@heroicons/react/20/solid';
import {
	TaskPrioritiesForm,
	TaskSizesForm,
	TaskStatusesForm,
} from 'lib/settings';
import { VersionForm } from 'lib/settings/version-form';
import { ITaskVersionCreate } from '@app/interfaces';

type StatusType = 'version' | 'epic' | 'status' | 'label' | 'size' | 'priority';

const TaskSecondaryInfo = () => {
	const task = useRecoilValue(detailedTaskState);
	const taskVersion = useRecoilValue(taskVersionListState);
	const $taskVersion = useSyncRef(taskVersion);

	const { handleStatusUpdate } = useTeamTasks();

	const { trans } = useTranslation('taskDetails');

	const modal = useModal();
	const [formTarget, setFormTarget] = useState<StatusType | null>(null);

	const openModalEditionHandle = useCallback(
		(type: StatusType) => {
			return () => {
				setFormTarget(type);
				modal.openModal();
			};
		},
		[modal]
	);

	const onVersionCreated = useCallback(
		(version: ITaskVersionCreate) => {
			if ($taskVersion.current.length === 0) {
				handleStatusUpdate(version.value || version.name, 'version', task);
			}
		},
		[$taskVersion, task, handleStatusUpdate]
	);

	return (
		<section className="flex flex-col p-[15px]">
			<TaskRow labelTitle={trans.VERSION} wrapperClassName="mb-3">
				<ActiveTaskVersionDropdown
					task={task}
					className="lg:min-w-[170px] text-black"
					forDetails={true}
					sidebarUI={true}
				>
					<Button
						className="w-full py-1 px-2 text-xs mt-3 dark:text-white dark:border-white"
						variant="outline"
						onClick={openModalEditionHandle('version')}
					>
						<PlusIcon className="w-[16px] h-[16px]" />
					</Button>
				</ActiveTaskVersionDropdown>
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
				<ActiveTaskStatusDropdown
					task={task}
					className="lg:min-w-[170px] text-black"
					forDetails={true}
					sidebarUI={true}
				>
					<Button
						className="w-full py-1 px-2 text-xs mt-3 dark:text-white dark:border-white"
						variant="outline"
						onClick={openModalEditionHandle('status')}
					>
						<PlusIcon className="w-[16px] h-[16px]" />
					</Button>
				</ActiveTaskStatusDropdown>
			</TaskRow>

			<TaskRow labelTitle={trans.LABELS} wrapperClassName="mb-3">
				<TaskLabels
					task={task}
					className="lg:min-w-[170px] text-black mt-4 lg:mt-0"
					forDetails={true}
				/>
			</TaskRow>

			<TaskRow labelTitle={trans.SIZE} wrapperClassName="mb-3 text-black">
				<ActiveTaskSizesDropdown
					task={task}
					className="lg:min-w-[170px] text-black"
					forDetails={true}
					largerWidth={true}
					sidebarUI={true}
				>
					<Button
						className="w-full py-1 px-2 text-xs mt-3 dark:text-white dark:border-white"
						variant="outline"
						onClick={openModalEditionHandle('size')}
					>
						<PlusIcon className="w-[16px] h-[16px]" />
					</Button>
				</ActiveTaskSizesDropdown>
			</TaskRow>

			<TaskRow labelTitle={trans.PRIORITY} wrapperClassName="mb-3 text-black">
				<ActiveTaskPropertiesDropdown
					task={task}
					className="lg:min-w-[170px] text-black "
					forDetails={true}
					largerWidth={true}
					sidebarUI={true}
				>
					<Button
						className="w-full text-xs py-1 px-2 mt-3 dark:text-white dark:border-white"
						variant="outline"
						onClick={openModalEditionHandle('priority')}
					>
						<PlusIcon className="w-[16px] h-[16px]" />
					</Button>
				</ActiveTaskPropertiesDropdown>
			</TaskRow>
			<hr className="text-[#F2F2F2] mt-[15px]" />

			<Modal isOpen={modal.isOpen} closeModal={modal.closeModal}>
				<Card className="sm:w-[530px] w-[330px]" shadow="custom">
					{formTarget === 'version' && (
						<VersionForm
							onVersionCreated={onVersionCreated}
							onCreated={modal.closeModal}
							formOnly={true}
						/>
					)}
					{formTarget === 'status' && (
						<TaskStatusesForm onCreated={modal.closeModal} formOnly={true} />
					)}
					{formTarget === 'priority' && (
						<TaskPrioritiesForm onCreated={modal.closeModal} formOnly={true} />
					)}
					{formTarget === 'size' && (
						<TaskSizesForm onCreated={modal.closeModal} formOnly={true} />
					)}
				</Card>
			</Modal>
		</section>
	);
};

export default TaskSecondaryInfo;
