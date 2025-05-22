import { HostKeys, useHotkeys, useModal } from '@/core/hooks';
import { ITask, OT_Member } from '@/core/types/interfaces/to-review';
import { clsxm } from '@/core/lib/utils';
import { Modal } from '@/core/components';
import { PropsWithChildren, useCallback } from 'react';
import { TaskInput } from '../../tasks/task-input';
import { useTranslations } from 'next-intl';

export function TaskUnOrAssignPopover({
	children,
	tasks,
	onTaskClick,
	buttonClassName,
	onTaskCreated,
	usersTaskCreatedAssignTo,
	userProfile
}: PropsWithChildren<{
	tasks?: ITask[];
	onTaskClick?: (task: ITask, close: () => void) => void;
	buttonClassName?: string;
	onTaskCreated?: (task: ITask | undefined, close: () => void) => void;
	usersTaskCreatedAssignTo?: {
		id: string;
	}[];
	userProfile: OT_Member | undefined;
}>) {
	const t = useTranslations();
	const { isOpen, openModal, closeModal } = useModal();

	// Handling Hotkeys
	const handleAssignTask = useCallback(() => {
		if (isOpen) {
			closeModal();
		} else {
			openModal();
		}
	}, [isOpen, openModal, closeModal]);
	useHotkeys(HostKeys.ASSIGN_TASK, handleAssignTask);

	return (
		<>
			<span
				onClick={openModal}
				className={clsxm(
					'flex items-center mb-1.5 outline-none border-none cursor-pointer rounded-xl',
					buttonClassName
				)}
			>
				{children}
			</span>

			<Modal
				isOpen={isOpen}
				closeModal={closeModal}
				title={
					userProfile?.employee.user?.name
						? `${t('common.ASSIGN_TASK_TO')} ${userProfile?.employee.user?.name}`
						: ''
				}
				className="bg-light--theme-light dark:bg-dark--theme-light p-5 rounded-xl w-full md:w-[70vw] h-[70vh] justify-start"
				titleClass="font-normal"
			>
				<TaskInput
					task={null}
					tasks={tasks}
					initEditMode={true}
					keepOpen={true}
					autoAssignTaskAuth={false}
					createOnEnterClick={true}
					viewType="one-view"
					onTaskClick={(task) => onTaskClick && onTaskClick(task, close)}
					onTaskCreated={(task) => onTaskCreated && onTaskCreated(task, close)}
					usersTaskCreatedAssignTo={usersTaskCreatedAssignTo}
					cardWithoutShadow
					fullWidthCombobox
					fullHeightCombobox
					autoFocus
					assignTaskPopup={true}
				/>
			</Modal>
		</>
	);
}
