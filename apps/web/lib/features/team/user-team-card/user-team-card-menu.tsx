import { mergeRefs } from '@app/helpers';
import { I_TeamMemberCardHook, I_TMCardTaskEditHook } from '@app/hooks';
import { IClassName, ITeamTask } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Popover, Transition } from '@headlessui/react';
import { Card, ConfirmDropdown, SpinnerLoader, Text } from 'lib/components';
import { MoreIcon } from 'lib/components/svgs';
import { TaskInput } from 'lib/features';
import { useTranslation } from 'lib/i18n';
import { PropsWithChildren, useCallback } from 'react';

type Props = IClassName & {
	memberInfo: I_TeamMemberCardHook;
	edition: I_TMCardTaskEditHook;
};

export function UserTeamCardMenu(props: Props) {
	return (
		<div className="absolute right-2">
			<DropdownMenu {...props} />
		</div>
	);
}

function DropdownMenu({ edition, memberInfo }: Props) {
	const { onAssignTask, onUnAssignTask, onRemoveMember } = useDropdownAction({
		edition,
		memberInfo,
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
			active: memberInfo.isAuthTeamManager || memberInfo.isAuthUser,
		},
		{
			name: trans.common.ESTIMATE,
			closable: true,
			onClick: () => {
				edition.task && edition.setEstimateEditMode(true);
			},
			active: memberInfo.isAuthTeamManager || memberInfo.isAuthUser,
		},
		{
			name: trans.common.ASSIGN_TASK,
			active: memberInfo.isAuthTeamManager,
			action: 'assign',
			onClick: onAssignTask,
		},
		{
			name: trans.common.UNASSIGN_TASK,
			active: memberInfo.isAuthTeamManager,
			action: 'unassign',
			closable: true,
			onClick: onUnAssignTask,
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
			closable: true,
		},
		{
			name: trans.common.REMOVE,
			type: 'danger',
			action: 'remove',
			active: memberInfo.isAuthTeamManager && !memberInfo.isAuthUser,
			onClick: onRemoveMember,
		},
	].filter((item) => item.active || item.active === undefined);

	return (
		<Popover
			className="relative"
			ref={mergeRefs([
				edition.estimateEditIgnoreElement.ignoreElementRef,
				edition.taskEditIgnoreElement.ignoreElementRef,
			])}
		>
			{!loading && (
				<Popover.Button
					disabled={menu.length === 0}
					className={clsxm(
						'flex items-center outline-none border-none',
						menu.length === 0 && ['opacity-50']
					)}
				>
					<MoreIcon />
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
				className="absolute z-10 right-0 min-w-[210px]"
			>
				<Popover.Panel>
					{({ close }) => {
						return (
							<Card shadow="custom" className="shadow-xlcard !py-3 !px-4">
								<ul>
									{menu.map((item, i) => {
										const text = (
											<Text
												className={clsxm(
													'font-normal whitespace-nowrap hover:font-semibold hover:transition-all',
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
													<AssignActionMenu
														memberInfo={memberInfo}
														edition={edition}
														onTaskClick={(task, closeCmbx) => {
															// Can close all open combobox
															item.onClick &&
																item.onClick({
																	task,
																	closeCombobox1: closeCmbx,
																	closeCombobox2: close,
																});
														}}
													>
														{text}
													</AssignActionMenu>
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

function AssignActionMenu({
	children,
	onTaskClick,
	memberInfo,
}: PropsWithChildren<
	{
		onTaskClick?: (task: ITeamTask, closeCombobox: () => void) => void;
	} & Props
>) {
	return (
		<Popover className="relative">
			<Popover.Button className="flex items-center mb-2 outline-none border-none">
				{children}
			</Popover.Button>

			<Transition
				enter="transition duration-100 ease-out"
				enterFrom="transform scale-95 opacity-0"
				enterTo="transform scale-100 opacity-100"
				leave="transition duration-75 ease-out"
				leaveFrom="transform scale-100 opacity-100"
				leaveTo="transform scale-95 opacity-0"
				className="absolute z-10 right-[110%] top-0"
			>
				<Popover.Panel>
					{({ close }) => {
						return (
							<TaskInput
								task={null}
								tasks={memberInfo.unassignTasks}
								initEditMode={true}
								keepOpen={true}
								autoAssignTask={false}
								viewType="one-view"
								onTaskClick={(task) => onTaskClick && onTaskClick(task, close)}
							/>
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

function useDropdownAction({
	edition,
	memberInfo,
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
		console.log('onUnAssignTask');
	}, []);

	const onRemoveMember = useCallback(({ close }: { close?: () => void }) => {
		memberInfo.removeMemberFromTeam();
		close && close();
	}, []);

	return {
		onAssignTask,
		onUnAssignTask,
		onRemoveMember,
	};
}
