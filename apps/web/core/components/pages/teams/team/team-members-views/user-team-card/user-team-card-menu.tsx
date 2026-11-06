import { mergeRefs } from '@/core/lib/helpers/index';
import {
	I_TMCardTaskEditHook,
	I_MemberIdentityHook,
	I_TeamMemberMutationsHook,
	I_TeamMemberRoleActionsHook
} from '@/core/hooks';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { clsxm } from '@/core/lib/utils';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { ConfirmDropdown, SpinnerLoader } from '@/core/components';
import { TaskUnOrAssignPopover } from '@/core/components/features/tasks/task-assign-popover';
import { Fragment, useCallback, useMemo } from 'react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import {
	Calendar,
	MoreVertical,
	Pencil,
	ShieldUser,
	Star,
	Timer,
	Trash,
	UserAdd,
	UserRemove
} from '@/core/components/icons';
import { buttonVariants } from '@/core/components/duplicated-components/_button';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { Spinner } from '@/core/components/common/spinner';
import { useFavoriteTasks } from '@/core/hooks/tasks/use-favorites-task';
import { useSetAtom } from 'jotai';
import { allPlansModalState } from '@/core/stores/all-plans-modal';
import { toast } from 'sonner';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { cn } from '@/core/lib/helpers';
import {
	MENU_ANCHOR,
	MENU_ANCHORED_PANEL,
	MENU_ROW,
	MENU_ROW_DESTRUCTIVE,
	MENU_SEPARATOR,
	MENU_SURFACE
} from '@/core/components/common/menu-recipes';

type Props = IClassName & {
	identity: I_MemberIdentityHook;
	memberTask: TTask | null;
	mutations: I_TeamMemberMutationsHook;
	roleActions: I_TeamMemberRoleActionsHook;
	edition: I_TMCardTaskEditHook;
};

type MemberMenuGroup = 'task' | 'assignment' | 'member';

const MENU_GROUP_ORDER: MemberMenuGroup[] = ['task', 'assignment', 'member'];

function favoriteLabelKey(isFavorite: boolean) {
	if (isFavorite) {
		return 'common.REMOVE_FAVORITE_TASK' as const;
	}
	return 'common.ADD_FAVORITE_TASK' as const;
}

function favoriteIcon(isLoading: boolean) {
	if (isLoading) {
		return <Spinner />;
	}
	return <Star />;
}

function managerLabelKey(isTeamManager: boolean) {
	if (isTeamManager) {
		return 'common.UNMAKE_A_MANAGER' as const;
	}
	return 'common.MAKE_A_MANAGER' as const;
}

export function UserTeamCardMenu(props: Props) {
	return <DropdownMenu {...props} />;
}

function DropdownMenu({ edition, identity, memberTask, mutations, roleActions }: Props) {
	const { onAssignTask, onUnAssignTask, onRemoveMember } = useDropdownAction({
		edition,
		identity,
		memberTask,
		mutations,
		roleActions
	});
	const { toggleFavoriteTask, isFavoriteTask, addTaskToFavoriteLoading, deleteTaskFromFavoritesLoading } =
		useFavoriteTasks();
	const t = useTranslations();
	const loading = edition.loading || roleActions.updateOTeamLoading;

	// Use global modal state instead of local state
	const setAllPlansModal = useSetAtom(allPlansModalState);

	const openAllPlansModal = useCallback(() => {
		setAllPlansModal({
			isOpen: true,
			employeeId: identity.member?.employeeId ?? null
		});
	}, [setAllPlansModal, identity.member?.employeeId]);

	const canActOnOwnWork = identity.isAuthTeamManager || identity.isAuthUser;
	const canManageMember = identity.isAuthTeamManager && !identity.isAuthUser && !identity.isTeamCreator;
	const isFavoriteLoading = addTaskToFavoriteLoading || deleteTaskFromFavoritesLoading;
	const isCurrentTaskFavorite = Boolean(edition.task && isFavoriteTask(edition.task.id));
	let toggleManagerRole = roleActions.makeMemberManager;
	if (identity.isTeamManager) {
		toggleManagerRole = roleActions.unMakeMemberManager;
	}
	const memberEmployeeId = identity.member?.employeeId;
	let assignToCurrentMember: { id: string }[] | undefined;
	if (memberEmployeeId) {
		assignToCurrentMember = [{ id: memberEmployeeId }];
	}

	const allMenuItems = useMemo(
		() => [
			{
				name: t('common.EDIT_TASK'),
				icon: <Pencil />,
				group: 'task' as const,
				closable: true,
				onClick: () => {
					edition.task && edition.setEditMode(true);
				},
				active: canActOnOwnWork && edition.task
			},
			{
				name: t('common.ESTIMATE'),
				icon: <Timer />,
				group: 'task' as const,
				closable: true,
				onClick: () => {
					edition.task && edition.setEstimateEditMode(true);
				},
				active: canActOnOwnWork && edition.task
			},
			{
				name: t(favoriteLabelKey(isCurrentTaskFavorite)),
				icon: favoriteIcon(isFavoriteLoading),
				group: 'task' as const,
				closable: true,
				onClick: () => {
					edition.task && toggleFavoriteTask(edition.task);
				},
				active: canActOnOwnWork && edition.task
			},
			{
				name: t('common.ASSIGN_TASK'),
				icon: <UserAdd />,
				group: 'assignment' as const,
				action: 'assign',
				onClick: onAssignTask,
				active: canActOnOwnWork && mutations.memberUnassignTasks.length > 0
			},
			{
				name: t('common.UNASSIGN_TASK'),
				icon: <UserRemove />,
				group: 'assignment' as const,
				action: 'unassign',
				closable: true,
				onClick: onUnAssignTask,
				active: canActOnOwnWork && !!memberTask
			},
			{
				name: t(managerLabelKey(identity.isTeamManager)),
				icon: <ShieldUser />,
				group: 'member' as const,
				onClick: toggleManagerRole,
				active: canManageMember,
				closable: true
			},
			{
				name: t('common.REMOVE'),
				icon: <Trash />,
				group: 'member' as const,
				type: 'danger',
				action: 'remove',
				active: canManageMember,
				onClick: onRemoveMember
			}
		],
		[
			t,
			identity.isTeamManager,
			memberTask,
			mutations,
			roleActions,
			edition,
			toggleManagerRole,
			canActOnOwnWork,
			canManageMember,
			isFavoriteLoading,
			isCurrentTaskFavorite,
			toggleFavoriteTask,
			onAssignTask,
			onUnAssignTask,
			onRemoveMember
		]
	);

	const menu = useMemo(() => allMenuItems.filter((item) => item.active), [allMenuItems]);

	const menuGroups = useMemo(() => {
		const groups = MENU_GROUP_ORDER.map((group) => menu.filter((item) => item.group === group));
		return groups.filter((items) => items.length > 0);
	}, [menu]);

	const ignoreOutsideClickRef = mergeRefs([
		edition.estimateEditIgnoreElement.ignoreElementRef,
		edition.taskEditIgnoreElement.ignoreElementRef
	]);

	return (
		<>
			<Popover className="flex relative flex-col justify-center items-center w-full" ref={ignoreOutsideClickRef}>
				{!loading && (
					<PopoverButton
						disabled={menu.length === 0}
						aria-label={t('common.MORE_OPTIONS')}
						className={clsxm(
							buttonVariants({ variant: 'ghost', size: 'icon' }),
							'text-muted-foreground data-open:bg-foreground/5',
							menu.length === 0 && ['opacity-50 hidden']
						)}
					>
						<MoreVertical className="size-4" />
					</PopoverButton>
				)}
				{loading && <SpinnerLoader size={20} />}

				<PopoverPanel
					ref={ignoreOutsideClickRef}
					anchor={MENU_ANCHOR}
					transition
					className={cn(MENU_SURFACE, MENU_ANCHORED_PANEL)}
				>
					{({ close }) => (
						<ul className="flex w-full flex-col">
							{menuGroups.map((items, groupIndex) => (
								<Fragment key={items[0].group}>
									{groupIndex > 0 && <li role="separator" className={MENU_SEPARATOR} />}
									{items.map((item) => {
										const isDanger = item.type === 'danger';
										const rowClassName = cn(MENU_ROW, isDanger && MENU_ROW_DESTRUCTIVE);
										const row = (
											<span className={rowClassName}>
												{item.icon}
												{item.name}
											</span>
										);
										const assignAction = item.action === 'assign';
										const removeAction = item.action === 'remove';
										const plainAction = !assignAction && !removeAction;

										return (
											<li key={`${item.group}-${item.action ?? ''}-${String(item.name)}`}>
												{assignAction && (
													<TaskUnOrAssignPopover
														buttonClassName="mb-0 w-full rounded-md"
														tasks={mutations.memberUnassignTasks}
														onTaskClick={(task, closeCmbx) => {
															item.onClick &&
																item.onClick({
																	task,
																	closeCombobox1: closeCmbx,
																	closeCombobox2: close
																});
														}}
														userProfile={identity.member}
														usersTaskCreatedAssignTo={assignToCurrentMember}
													>
														{row}
													</TaskUnOrAssignPopover>
												)}

												{removeAction && (
													<ConfirmDropdown
														onConfirm={() => {
															item.onClick && item.onClick({ close });
														}}
													>
														{row}
													</ConfirmDropdown>
												)}

												{plainAction && (
													<button
														type="button"
														className="w-full text-left"
														onClick={() => {
															item.onClick && item.onClick({});
															item.closable && close();
														}}
													>
														{row}
													</button>
												)}
											</li>
										);
									})}
								</Fragment>
							))}
							<li role="separator" className={MENU_SEPARATOR} />
							<li>
								<button type="button" onClick={openAllPlansModal} className={MENU_ROW}>
									<Calendar />
									{t('common.plan.SEE_PLANS')}
								</button>
							</li>
						</ul>
					)}
				</PopoverPanel>
			</Popover>
			{/* AllPlansModal is now rendered globally in app-sidebar.tsx */}
		</>
	);
}

type IAssignCall = (params: {
	task?: TTask;
	closeCombobox1?: () => void;
	closeCombobox2?: () => void;
}) => void | Promise<void>;

export function useDropdownAction({
	edition,
	identity,
	memberTask,
	mutations,
	roleActions
}: Pick<Props, 'edition' | 'identity' | 'memberTask' | 'mutations' | 'roleActions'>) {
	const t = useTranslations();

	const showAssignmentError = useCallback(
		(error: unknown) => {
			const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
			toast.error(t('toasts.tasks.ASSIGNEES_NOT_SAVED'), { description: t(reasonKey) });
		},
		[t]
	);

	const showTaskAssigned = useCallback(
		(task: TTask) => {
			const employee = identity.member?.employee;
			const memberName = employee?.fullName || employee?.user?.name;
			const title = task.title;
			if (memberName) {
				toast.success(t('toasts.teams.TASK_ASSIGNED_TO_MEMBER', { title, name: memberName }), {
					id: 'task-assigned'
				});
				return;
			}
			toast.success(t('toasts.teams.TASK_ASSIGNED', { title }), { id: 'task-assigned' });
		},
		[identity.member, t]
	);

	const onAssignTask: IAssignCall = useCallback(
		async ({ task, closeCombobox1, closeCombobox2 }) => {
			if (!task) return;

			edition.setLoading(true);
			try {
				const wasSent = await mutations.assignTask(task);
				if (wasSent) {
					showTaskAssigned(task);
				}
			} catch (error) {
				showAssignmentError(error);
				return;
			} finally {
				edition.setLoading(false);
			}

			closeCombobox1?.();
			closeCombobox2?.();
		},
		[edition, mutations.assignTask, showTaskAssigned, showAssignmentError]
	);

	const onUnAssignTask: IAssignCall = useCallback(async () => {
		if (!memberTask) return;

		edition.setLoading(true);
		try {
			await mutations.unassignTask(memberTask);
		} catch (error) {
			showAssignmentError(error);
		} finally {
			edition.setLoading(false);
		}
	}, [memberTask, mutations.unassignTask, edition, showAssignmentError]);

	const onRemoveMember = useCallback(
		({ close }: { close?: () => void }) => {
			roleActions.removeMemberFromTeam();
			close?.();
		},
		[roleActions.removeMemberFromTeam]
	);

	return {
		onAssignTask,
		onUnAssignTask,
		onRemoveMember
	};
}
