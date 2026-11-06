import { Spinner } from '@/core/components/common/spinner';
import { Button } from '@/core/components/duplicated-components/_button';
import { cn } from '@/core/lib/helpers';
import { Description, Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import {
	DialogBreadcrumb,
	DialogBreadcrumbSeparator,
	DialogHeaderRow,
	dialogTitleText
} from '@/core/components/common/dialog';
import { modalFooterClass, modalPrimaryActionClass, modalSecondaryActionClass } from '@/core/components/common/modal';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { useUpdateTask, useSetActiveTask } from '@/core/hooks/organizations';
import { IInviteProps } from '../teams/invite-modal';
import { ETaskStatusName } from '@/core/types/generics/enums/task';
import { useAtomValue } from 'jotai';
import { activeTeamTaskState } from '@/core/stores';

const DeleteTask = ({ isOpen, closeModal, task }: IInviteProps) => {
	const activeTeamTask = useAtomValue(activeTeamTaskState);
	const { updateTask, updateLoading } = useUpdateTask();
	const { setActiveTask } = useSetActiveTask();
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
			<Dialog as="div" onClick={(e: any) => e.stopPropagation()} className="relative z-[1000]" onClose={onClose}>
				<TransitionChild
					as="div"
					enter="ease-out duration-200"
					enterFrom="opacity-0"
					enterTo="opacity-100"
					leave="ease-in duration-150"
					leaveFrom="opacity-100"
					leaveTo="opacity-0"
				>
					<div className="fixed inset-0 bg-black/20" />
				</TransitionChild>

				<div className="overflow-y-auto fixed inset-0">
					<div className="flex justify-center items-center p-4 min-h-full text-center">
						<TransitionChild
							as="div"
							enter="transition-[opacity,scale] ease-out duration-200"
							enterFrom="opacity-0 scale-[0.98]"
							enterTo="opacity-100 scale-100"
							leave="transition-[opacity,scale] ease-in duration-150"
							leaveFrom="opacity-100 scale-100"
							leaveTo="opacity-0 scale-[0.98]"
						>
							<DialogPanel className="flex w-[26rem] max-w-full flex-col gap-4 overflow-hidden rounded-[16px] surface-raised p-5 text-left align-middle text-popover-foreground">
								<DialogHeaderRow>
									{task?.taskNumber && (
										<DialogBreadcrumb className="tabular-nums">
											#{task?.taskNumber}
										</DialogBreadcrumb>
									)}
									{task?.taskNumber && <DialogBreadcrumbSeparator />}
									<DialogTitle className={dialogTitleText}>
										{t('task.CONFIRM_CLOSE_TASK')}
									</DialogTitle>
								</DialogHeaderRow>
								{task?.title && (
									<Description className="-mt-2 text-[13px] text-muted-foreground">
										{task?.title}
									</Description>
								)}
								<div className={modalFooterClass}>
									<Button
										className={modalSecondaryActionClass}
										variant="ghost"
										size="default"
										type="submit"
										onClick={closeModal}
									>
										{t('common.CANCEL')}
									</Button>
									<Button
										className={cn(modalPrimaryActionClass, updateLoading && 'opacity-50')}
										size="default"
										type="submit"
										onClick={handleChange}
									>
										{updateLoading && (
											<span>
												<Spinner />
											</span>
										)}{' '}
										{t('common.CONFIRM')}
									</Button>
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
