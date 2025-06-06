import { Spinner } from '@/core/components/common/spinner';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { useTeamTasks } from '@/core/hooks/organizations';
import { IInviteProps } from '../teams/invite-modal';
import { ETaskStatusName } from '@/core/types/generics/enums/task';

const DeleteTask = ({ isOpen, closeModal, task }: IInviteProps) => {
	const { updateTask, updateLoading, setActiveTask, activeTeamTask } = useTeamTasks();
	const t = useTranslations();
	const handleChange = useCallback(async () => {
		if (task) {
			await updateTask({
				...task,
				status: ETaskStatusName.CLOSED
			});
		}
		closeModal();
		if (activeTeamTask?.id === task?.id) {
			setActiveTask(null);
		}
	}, [closeModal, setActiveTask, task, updateTask, activeTeamTask?.id]);

	const onClose = useCallback(() => {
		return;
	}, []);

	return (
		<Transition appear show={isOpen} as="div">
			<Dialog as="div" onClick={(e: any) => e.stopPropagation()} className="relative z-10" onClose={onClose}>
				<div className="fixed inset-0 blur-xl bg-black/30" aria-hidden="true" />
				<TransitionChild
					as="div"
					enter="ease-out duration-300"
					enterFrom="opacity-0"
					enterTo="opacity-100"
					leave="ease-in duration-200"
					leaveFrom="opacity-100"
					leaveTo="opacity-0"
				>
					<div className="fixed inset-0 bg-black bg-opacity-25 blur-xl" />
				</TransitionChild>

				<div className="fixed inset-0 overflow-y-auto">
					<div className="flex items-center justify-center min-h-full p-4 text-center">
						<TransitionChild
							as="div"
							enter="ease-out duration-300"
							enterFrom="opacity-0 scale-95"
							enterTo="opacity-100 scale-100"
							leave="ease-in duration-200"
							leaveFrom="opacity-100 scale-100"
							leaveTo="opacity-0 scale-95"
						>
							<DialogPanel className="w-[414px] px-[40px] py-[16px] max-w-md transform overflow-hidden rounded-[40px] bg-[#FFFFFF] dark:bg-[#202023] text-left align-middle shadow-xl shadow-[#3E1DAD0D] transition-all">
								<div className="text-primary text-[18px] dark:text-white text-center mb-4 mt-[30px]">
									{t('task.CONFIRM_CLOSE_TASK')} :{' '}
									{task?.taskNumber && <span>#{task?.taskNumber} </span>}
									<span>{task?.title}</span>
								</div>
								<div className="flex items-center justify-between w-full mt-2">
									<button
										className={`w-[120px] h-[40px] ${
											updateLoading ? 'opacity-50' : ''
										} my-4 inline-flex justify-center items-center tracking-wide text-white dark:text-primary transition-colors duration-200 transform bg-primary dark:bg-white rounded-[12px] hover:text-opacity-90 focus:outline-none`}
										type="submit"
										onClick={handleChange}
									>
										{updateLoading && (
											<span>
												<Spinner />
											</span>
										)}{' '}
										{t('common.CONFIRM')}
									</button>
									<button
										className={`w-[120px] h-[40px] my-4 inline-flex justify-center items-center tracking-wide text-white transition-colors duration-200 transform bg-gray-600 dark:bg-gray-700 rounded-[12px] hover:text-opacity-90 focus:outline-none`}
										type="submit"
										onClick={closeModal}
									>
										{t('common.CANCEL')}
									</button>
								</div>
							</DialogPanel>
						</TransitionChild>
					</div>
				</div>
			</Dialog>
		</Transition>
	);
};

export default DeleteTask;
