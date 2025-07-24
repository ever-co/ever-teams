import { mergeRefs } from '@/core/lib/helpers/index';
import { I_TeamMemberCardHook, I_TMCardTaskEditHook, useModal } from '@/core/hooks';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { clsxm } from '@/core/lib/utils';
import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react';
import { ConfirmDropdown, SpinnerLoader, Text } from '@/core/components';
import { TaskUnOrAssignPopover } from '@/core/components/features/tasks/task-assign-popover';
import { useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ThreeCircleOutlineVerticalIcon } from 'assets/svg';
import { AllPlansModal } from '@/core/components/daily-plan/all-plans-modal';
import { EverCard } from '@/core/components/common/ever-card';
import { HorizontalSeparator } from '@/core/components/duplicated-components/separator';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { Spinner } from '@/core/components/common/spinner';
import { useFavoriteTasks } from '@/core/hooks/tasks/use-favorites-task';

type Props = IClassName & {
	memberInfo: I_TeamMemberCardHook;
	edition: I_TMCardTaskEditHook;
};

export function UserTeamCardMenu(props: Props) {
	return <DropdownMenu {...props} />;
}

function DropdownMenu({ edition, memberInfo }: Props) {
	const { onAssignTask, onUnAssignTask, onRemoveMember } = useDropdownAction({
		edition,
		memberInfo
	});
	const { toggleFavoriteTask, isFavoriteTask, addTaskToFavoriteLoading, deleteTaskFromFavoritesLoading } =
		useFavoriteTasks();
	const t = useTranslations();
	const loading = edition.loading || memberInfo.updateOTeamLoading;

	const { isOpen: isAllPlansModalOpen, closeModal: closeAllPlansModal, openModal: openAllPlansModal } = useModal();

	const menu = useMemo(
		() => [
			{
				name: t('common.EDIT_TASK'),
				closable: true,
				onClick: () => {
					edition.task && edition.setEditMode(true);
				},
				active: (memberInfo.isAuthTeamManager || memberInfo.isAuthUser) && edition.task
			},
			{
				name: edition.task ? (
					addTaskToFavoriteLoading || deleteTaskFromFavoritesLoading ? (
						<Spinner />
					) : isFavoriteTask(edition.task?.id) ? (
						t('common.REMOVE_FAVORITE_TASK')
					) : (
						t('common.ADD_FAVORITE_TASK')
					)
				) : (
					t('common.ADD_FAVORITE_TASK')
				),
				closable: true,
				onClick: () => {
					edition.task && toggleFavoriteTask(edition.task);
				},
				active: (memberInfo.isAuthTeamManager || memberInfo.isAuthUser) && edition.task
			},
			{
				name: t('common.ESTIMATE'),
				closable: true,
				onClick: () => {
					edition.task && edition.setEstimateEditMode(true);
				},
				active: (memberInfo.isAuthTeamManager || memberInfo.isAuthUser) && edition.task
			},
			{
				name: t('common.ASSIGN_TASK'),
				action: 'assign',
				onClick: onAssignTask,

				active:
					(memberInfo.isAuthTeamManager || memberInfo.isAuthUser) && memberInfo.memberUnassignTasks.length > 0
			},
			{
				name: t('common.UNASSIGN_TASK'),
				action: 'unassign',
				closable: true,
				onClick: onUnAssignTask,

				active: (memberInfo.isAuthTeamManager || memberInfo.isAuthUser) && !!memberInfo.memberTask
			},
			{
				name: memberInfo.isTeamManager ? t('common.UNMAKE_A_MANAGER') : t('common.MAKE_A_MANAGER'),
				// MAke or unmake member a manager
				onClick: memberInfo.isTeamManager ? memberInfo.unMakeMemberManager : memberInfo.makeMemberManager,
				active: memberInfo.isAuthTeamManager && !memberInfo.isAuthUser && !memberInfo.isTeamCreator,
				closable: true
			},
			{
				name: t('common.REMOVE'),
				type: 'danger',
				action: 'remove',
				active: memberInfo.isAuthTeamManager && !memberInfo.isAuthUser && !memberInfo.isTeamCreator,
				onClick: onRemoveMember
			}
		],
		[t, memberInfo, edition, isFavoriteTask]
	);

	return (
		<>
			<Popover
				className="relative flex flex-col items-center justify-center w-full"
				ref={mergeRefs([
					edition.estimateEditIgnoreElement.ignoreElementRef,
					edition.taskEditIgnoreElement.ignoreElementRef
				])}
			>
				{!loading && (
					<PopoverButton
						disabled={menu.length === 0}
						className={clsxm(
							'flex items-center outline-none border-none',
							menu.length === 0 && ['opacity-50 hidden']
						)}
					>
						<ThreeCircleOutlineVerticalIcon className="w-6 dark:text-[#B1AEBC]" strokeWidth="1.4" />
					</PopoverButton>
				)}
				{loading && <SpinnerLoader size={20} />}

				<Transition
					as="div"
					enter="transition duration-100 ease-out"
					enterFrom="transform scale-95 opacity-0"
					enterTo="transform scale-100 opacity-100"
					leave="transition duration-75 ease-out"
					leaveFrom="transform scale-100 opacity-100"
					leaveTo="transform scale-95 opacity-0"
					className="absolute z-30 -right-5 top-8 min-w-[13.125rem]"
				>
					<PopoverPanel>
						{({ close }) => {
							return (
								<EverCard
									shadow="custom"
									className="shadow-xl card !py-3 !px-4 dark:bg-[#1B1D22] dark:border dark:border-[#FFFFFF33] w-fit min-w-[10.75rem]"
								>
									<ul className="flex flex-col items-start w-full">
										{menu.map((item, i) => {
											const text = (
												<Text
													className={clsxm(
														'font-normal whitespace-nowrap text-sm hover:font-semibold hover:transition-all',
														item.type === 'danger' && ['text-red-500']
													)}
												>
													{item.name}
												</Text>
											);

											// When true show combobox component (AssignActionMenu)
											const assignAction = item.action === 'assign';

											const removeAction = item.action === 'remove';

											return (
												<li key={i}>
													{assignAction && (
														// Show only for item with combobox menu
														<TaskUnOrAssignPopover
															tasks={memberInfo.memberUnassignTasks}
															onTaskClick={(task, closeCmbx) => {
																// Can close all open combobox
																item.onClick &&
																	item.onClick({
																		task,
																		closeCombobox1: closeCmbx,
																		closeCombobox2: close
																	});
															}}
															userProfile={memberInfo.member}
															usersTaskCreatedAssignTo={
																memberInfo.member?.employeeId
																	? [{ id: memberInfo.member?.employeeId }]
																	: undefined
															}
														>
															{text}
														</TaskUnOrAssignPopover>
													)}

													{removeAction && (
														<ConfirmDropdown
															className="right-[110%] top-0"
															onConfirm={() => {
																item.onClick && item.onClick({ close });
															}}
														>
															{text}
														</ConfirmDropdown>
													)}

													{/* WHen hasn't an action */}
													{!assignAction && !removeAction && (
														<button
															className="mb-2"
															onClick={() => {
																item.onClick && item.onClick({});
																item.closable && close();
															}}
														>
															{text}
														</button>
													)}
												</li>
											);
										})}
										<HorizontalSeparator className="-mx-2" />
										<ul className="flex flex-col items-start w-full py-1">
											<button
												onClick={openAllPlansModal}
												className={clsxm(
													'font-normal whitespace-nowrap text-sm hover:font-semibold hover:transition-all'
												)}
											>
												{t('common.plan.SEE_PLANS')}
											</button>
										</ul>
									</ul>
								</EverCard>
							);
						}}
					</PopoverPanel>
				</Transition>
			</Popover>
			<AllPlansModal isOpen={isAllPlansModalOpen} closeModal={closeAllPlansModal} />
		</>
	);
}

type IAssignCall = (params: { task?: TTask; closeCombobox1?: () => void; closeCombobox2?: () => void }) => void;

export function useDropdownAction({ edition, memberInfo }: Pick<Props, 'edition' | 'memberInfo'>) {
	const onAssignTask: IAssignCall = useCallback(
		async ({ task, closeCombobox1, closeCombobox2 }) => {
			if (!task) return;

			edition.setLoading(true);
			await memberInfo.assignTask(task).finally(() => edition.setLoading(false));

			closeCombobox1 && closeCombobox1();
			closeCombobox2 && closeCombobox2();
		},
		[edition, memberInfo]
	);

	const onUnAssignTask: IAssignCall = useCallback(() => {
		if (!memberInfo.memberTask) return;
		edition.setLoading(true);

		memberInfo.unassignTask(memberInfo.memberTask).finally(() => edition.setLoading(false));
	}, [memberInfo, edition]);

	const onRemoveMember = useCallback(
		({ close }: { close?: () => void }) => {
			memberInfo.removeMemberFromTeam();
			close && close();
		},
		[memberInfo]
	);

	return {
		onAssignTask,
		onUnAssignTask,
		onRemoveMember
	};
}
