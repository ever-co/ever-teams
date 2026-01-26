import { Spinner } from '@/core/components/common/spinner';
import { useCurrentActiveTask } from '@/core/hooks/organizations/teams/use-current-active-task';
import { useSetActiveTask } from '@/core/hooks/organizations/teams/use-set-active-task';
import { useUpdateTaskMutation } from '@/core/hooks/organizations/teams/use-update-task.mutation';
import { ETaskStatusName } from '@/core/types/generics/enums/task';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { IInviteProps } from '../teams/invite-modal';

const DeleteTask = ({ isOpen, closeModal, task }: IInviteProps) => {
	const { task: activeTeamTask } = useCurrentActiveTask();
	const { mutateAsync: updateTask, isPending: updateLoading } = useUpdateTaskMutation();
	const { setActiveTask } = useSetActiveTask();
	const t = useTranslations();
	const handleChange = useCallback(async () => {
		if (task) {
			await updateTask({
				taskData: { ...task, status: ETaskStatusName.CLOSED },
				taskId: task?.id
			}).then((task) => setActiveTask(task));
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
					<div className="fixed inset-0 bg-black/25 blur-xl" />
				</TransitionChild>

				<div className="overflow-y-auto fixed inset-0">
					<div className="flex justify-center items-center p-4 min-h-full text-center">
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
								<div className="flex justify-between items-center mt-2 w-full">
									<button
										className={`inline-flex justify-center items-center my-4 tracking-wide text-white transition-colors duration-200 transform w-[120px] h-[40px] ${updateLoading ? 'opacity-50' : ''} dark:text-primary bg-primary dark:bg-white rounded-[12px] hover:text-white/90 focus:outline-none`}
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
										className={`inline-flex justify-center items-center my-4 tracking-wide text-white bg-gray-600 transition-colors duration-200 transform w-[120px] h-[40px] dark:bg-gray-700 rounded-[12px] hover:text-white/90 focus:outline-none`}
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
