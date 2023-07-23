import { useModal } from '@app/hooks';
import { detailedTaskState } from '@app/stores';
import {
	ActiveTaskLabelsDropdown,
	ActiveTaskPropertiesDropdown,
	ActiveTaskSizesDropdown,
	ActiveTaskStatusDropdown,
	ActiveTaskVersionDropdown,
	EpicPropertiesDropdown as TaskEpicDropdown,
} from 'lib/features';
import { useCallback, useState } from 'react';
import { useRecoilState } from 'recoil';
import TaskRow from '../components/task-row';
import { useTranslation } from 'lib/i18n';
import { Button, Card, Modal } from 'lib/components';
import { PlusIcon } from '@heroicons/react/20/solid';
import {
	TaskLabelForm,
	TaskPrioritiesForm,
	TaskSizesForm,
	TaskStatusesForm,
} from 'lib/settings';
import { VersionForm } from 'lib/settings/version-form';

type StatusType = 'version' | 'epic' | 'status' | 'label' | 'size' | 'priority';

const TaskSecondaryInfo = () => {
	const [task] = useRecoilState(detailedTaskState);
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

			<TaskRow labelTitle={trans.LABEL} wrapperClassName="mb-3">
				<ActiveTaskLabelsDropdown
					task={task}
					className="lg:min-w-[170px] text-black"
					forDetails={true}
					sidebarUI={true}
				>
					<Button
						className="w-full py-1 px-2 text-xs mt-3 dark:text-white dark:border-white"
						variant="outline"
						onClick={openModalEditionHandle('label')}
					>
						<PlusIcon className="w-[16px] h-[16px]" />
					</Button>
				</ActiveTaskLabelsDropdown>
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
						<VersionForm onCreated={modal.closeModal} formOnly={true} />
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
					{formTarget === 'label' && (
						<TaskLabelForm onCreated={modal.closeModal} formOnly={true} />
					)}
				</Card>
			</Modal>
		</section>
	);
};

export default TaskSecondaryInfo;
