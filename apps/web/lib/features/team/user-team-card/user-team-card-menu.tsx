import { mergeRefs } from '@app/helpers';
import { I_TeamMemberCardHook, I_TMCardTaskEditHook } from '@app/hooks';
import { IClassName, ITeamTask } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Popover, Transition } from '@headlessui/react';
import { Card, ConfirmDropdown, SpinnerLoader, Text } from 'lib/components';
import { MoreIcon } from 'lib/components/svgs';
import { TaskUnOrAssignPopover } from 'lib/features/task/task-assign-popover';
import { useTranslation } from 'lib/i18n';
import { useCallback } from 'react';

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

	const { trans } = useTranslation();
	const loading = edition.loading || memberInfo.updateOTeamLoading;

	const menu = [
		{
			name: trans.common.EDIT_TASK,
			closable: true,
			onClick: () => {
				edition.task && edition.setEditMode(true);
			},
			active:
				(memberInfo.isAuthTeamManager || memberInfo.isAuthUser) && edition.task
		},
		{
			name: trans.common.ESTIMATE,
			closable: true,
			onClick: () => {
				edition.task && edition.setEstimateEditMode(true);
			},
			active:
				(memberInfo.isAuthTeamManager || memberInfo.isAuthUser) && edition.task
		},
		{
			name: trans.common.ASSIGN_TASK,
			action: 'assign',
			onClick: onAssignTask,

			active:
				(memberInfo.isAuthTeamManager || memberInfo.isAuthUser) &&
				memberInfo.memberUnassignTasks.length > 0
		},
		{
			name: trans.common.UNASSIGN_TASK,
			action: 'unassign',
			closable: true,
			onClick: onUnAssignTask,

			active:
				(memberInfo.isAuthTeamManager || memberInfo.isAuthUser) &&
				!!memberInfo.memberTask
		},
		{
			name: memberInfo.isTeamManager
				? trans.common.UNMAKE_A_MANAGER
				: trans.common.MAKE_A_MANAGER,
			// MAke or unmake member a manager
			onClick: memberInfo.isTeamManager
				? memberInfo.unMakeMemberManager
				: memberInfo.makeMemberManager,
			active:
				memberInfo.isAuthTeamManager &&
				!memberInfo.isAuthUser &&
				!memberInfo.isTeamCreator,
			closable: true
		},
		{
			name: trans.common.REMOVE,
			type: 'danger',
			action: 'remove',
			active:
				memberInfo.isAuthTeamManager &&
				!memberInfo.isAuthUser &&
				!memberInfo.isTeamOwner,
			onClick: onRemoveMember
		}
	].filter((item) => item.active || item.active === undefined);

	return (
		<Popover
			className="relative"
			ref={mergeRefs([
				edition.estimateEditIgnoreElement.ignoreElementRef,
				edition.taskEditIgnoreElement.ignoreElementRef
			])}
		>
			{!loading && (
				<Popover.Button
					disabled={menu.length === 0}
					className={clsxm(
						'flex items-center outline-none border-none',
						menu.length === 0 && ['opacity-50 hidden']
					)}
				>
					<MoreIcon className="dark:stroke-[#B1AEBC]" />
				</Popover.Button>
			)}
			{loading && <SpinnerLoader size={20} />}

			<Transition
				enter="transition duration-100 ease-out"
				enterFrom="transform scale-95 opacity-0"
				enterTo="transform scale-100 opacity-100"
				leave="transition duration-75 ease-out"
				leaveFrom="transform scale-100 opacity-100"
				leaveTo="transform scale-95 opacity-0"
				className="absolute z-10 -right-5 min-w-[13.125rem]"
			>
				<Popover.Panel>
					{({ close }) => {
						return (
							<Card
								shadow="custom"
								className="shadow-xlcard !py-3 !px-4 dark:bg-[#1B1D22] dark:border dark:border-[#FFFFFF33] w-[10.75rem]"
							>
								<ul>
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
								</ul>
							</Card>
						);
					}}
				</Popover.Panel>
			</Transition>
		</Popover>
	);
}

type IAssignCall = (params: {
	task?: ITeamTask;
	closeCombobox1?: () => void;
	closeCombobox2?: () => void;
}) => void;

export function useDropdownAction({
	edition,
	memberInfo
}: Pick<Props, 'edition' | 'memberInfo'>) {
	const onAssignTask: IAssignCall = useCallback(
		({ task, closeCombobox1, closeCombobox2 }) => {
			if (!task) return;

			edition.setLoading(true);
			memberInfo.assignTask(task).finally(() => edition.setLoading(false));

			closeCombobox1 && closeCombobox1();
			closeCombobox2 && closeCombobox2();
		},
		[edition, memberInfo]
	);

	const onUnAssignTask: IAssignCall = useCallback(() => {
		if (!memberInfo.memberTask) return;
		edition.setLoading(true);

		memberInfo
			.unassignTask(memberInfo.memberTask)
			.finally(() => edition.setLoading(false));
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
