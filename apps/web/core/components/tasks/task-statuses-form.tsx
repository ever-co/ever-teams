/* eslint-disable no-mixed-spaces-and-tabs */
import { useModal, useRefetchData } from '@/core/hooks';
import { useTaskStatusesQuery } from '@/core/hooks/tasks/use-task-statuses-query';
import { useCreateTaskStatus } from '@/core/hooks/tasks/use-create-task-status';
import { useEditTaskStatus } from '@/core/hooks/tasks/use-edit-task-status';
import { useDeleteTaskStatus } from '@/core/hooks/tasks/use-delete-task-status';
import { useTaskSettingsAccess } from '@/core/hooks/tasks/use-task-settings-access';
import { tasksByTeamState } from '@/core/stores';
import { clsxm } from '@/core/lib/utils';
import { Spinner } from '@/core/components/common/spinner';
import { PlusIcon } from '@heroicons/react/20/solid';
import { Button, ColorPicker, Modal, Text } from '@/core/components';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { generateIconList, IIcon } from '../settings/icon-items';
import IconPopover from '../settings/icon-popover';
import { StatusesListCard } from '../settings/list-card';
import SortTasksStatusSettings from '@/core/components/pages/kanban/sort-tasks-status-settings';
import { DeleteTaskStatusConfirmationModal } from '@/core/components/features/tasks/delete-status-confirmation-modal';
import { StandardTaskStatusDropDown } from './task-status';
import { InputField } from '../duplicated-components/_input';
import { Tooltip } from '../duplicated-components/tooltip';
import { TTaskStatus } from '@/core/types/schemas';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';

// Settings row (label column + content) and the compact controls of the issue-settings blocks.
const ROW = 'sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4';
const LABEL = 'text-sm font-medium text-muted-foreground sm:pt-2';
const SUB_LABEL = 'text-xs font-medium text-muted-foreground';
const SECONDARY_BUTTON =
	'h-9 shrink-0 gap-1.5 rounded-md bg-card px-3 py-0 text-sm font-medium text-foreground hover:bg-muted disabled:pointer-events-none';
const PRIMARY_BUTTON = 'h-9 shrink-0 rounded-md px-3 py-0 text-sm font-medium hover:bg-primary/90';
const CANCEL_BUTTON = 'h-9 shrink-0 rounded-md px-3 py-0 text-sm font-medium';
// The icon and colour pickers draw their own 54px box; this sizes them like the other controls of the
// row without touching the shared picker components.
const PICKER = 'shrink-0 [&_.input-border]:h-9 [&_.input-border]:rounded-md [&_.rounded-xl]:h-9 [&_.rounded-xl]:rounded-md';

type StatusForm = {
	formOnly?: boolean;
	onCreated?: () => void;
};

export const TaskStatusesForm = ({ formOnly = false, onCreated }: StatusForm) => {
	const { data: user } = useUserQuery();
	const { register, setValue, handleSubmit, reset, getValues } = useForm();
	const [createNew, setCreateNew] = useState(formOnly);
	const [edit, setEdit] = useState<TTaskStatus | null>(null);
	const t = useTranslations();
	const [selectedStatusType, setSelectedStatusType] = useState<string | null>(null);
	const [randomColor, setRandomColor] = useState<string | undefined>(undefined);

	const taskStatusIconList: IIcon[] = generateIconList('task-statuses', [
		'open',
		'in-progress',
		'ready',
		'in-review',
		'blocked',
		'completed',
		'backlog'
	]);
	const taskSizesIconList: IIcon[] = generateIconList('task-sizes', ['x-large', 'large', 'medium', 'small', 'tiny']);
	const taskPrioritiesIconList: IIcon[] = generateIconList('task-priorities', ['urgent', 'high', 'medium', 'low']);

	const iconList: IIcon[] = useMemo(
		() => [
			...taskStatusIconList,
			...taskSizesIconList,
			...taskPrioritiesIconList
			// eslint-disable-next-line react-hooks/exhaustive-deps
		],
		[]
	);

	const { getTaskStatusesLoading, taskStatuses, setTaskStatuses } = useTaskStatusesQuery();
	const { createTaskStatus, createTaskStatusLoading } = useCreateTaskStatus();
	const { editTaskStatus, editTaskStatusLoading } = useEditTaskStatus();
	const { deleteTaskStatus } = useDeleteTaskStatus();
	const { refetch } = useRefetchData();
	const { canCreate, canWriteRow, canWriteRows, readOnlyHint } = useTaskSettingsAccess();
	const canReorder = canWriteRows(taskStatuses);

	useEffect(() => {
		if (!edit && !getValues().name) {
			setValue('name', '');
			setValue('color', '');
			setValue('icon', '');
		}
	}, [taskStatuses, edit, setValue, getValues]);

	useEffect(() => {
		if (edit) {
			setValue('name', edit.name?.split('-').join(' '));
			setValue('color', edit.color);
			setValue('icon', edit.icon);
		} else {
			setValue('name', '');
			setValue('color', '');
			setValue('icon', '');
		}
	}, [edit, setValue, createTaskStatus, editTaskStatus, user?.employee?.organizationId, user?.tenantId]);

	const onSubmit = useCallback(
		async (values: any) => {
			if (createNew) {
				const requestData = {
					name: values.name,
					value: values.name.split(' ').join('-').toLowerCase(),
					color: values.color,
					organizationId: user?.employee?.organizationId,
					tenantId: user?.tenantId ?? '',
					icon: values.icon,
					template: values.template
				};

				try {
					await createTaskStatus(requestData);
					!formOnly && setCreateNew(false);
					onCreated && onCreated();
					refetch();
					reset();
				} catch (error) {
					console.error('[WEB][TaskStatusesForm] Error creating status:', error);
				}
			}
			if (edit) {
				try {
					await editTaskStatus(edit.id, {
						name: values.name,
						color: values.color,
						icon: values.icon,
						template: values.template || 'blocked' // Add template with fallback
					});
					setEdit(null);
					refetch();
				} catch (error) {
					console.error('[WEB][TaskStatusesForm] Error editing status:', error);
				}
			}
		},
		[edit, createNew, formOnly, editTaskStatus, onCreated, user, reset, createTaskStatus, refetch]
	);

	const updateArray = taskStatuses.slice();
	const sortedArray =
		Array.isArray(updateArray) && updateArray.length > 0
			? updateArray.sort((a: any, b: any) => a.order - b.order)
			: [];
	const { isOpen, closeModal, openModal } = useModal();
	const {
		isOpen: isDeleteConfirmationOpen,
		closeModal: closeDeleteConfirmationModal,
		openModal: openDeleteConfirmationModal
	} = useModal();
	const [statusToDelete, setStatusToDelete] = useState<TTaskStatus | null>(null);
	const tasks = useAtomValue(tasksByTeamState);

	/**
	 * Get Icon by status name
	 *
	 * @param {string} iconName - Name of the icon
	 * @returns {IIcon} - Icon of the status
	 */
	const getIcon = useCallback(
		(iconName: string | null) => {
			if (!iconName) return null;

			const STATUS_MAPPINGS: Record<string, string> = {
				'ready-for-review': 'ready'
			};

			const name = STATUS_MAPPINGS[iconName] || iconName;

			const icon = iconList.find((icon) => icon.title === name);

			if (icon) {
				setValue('icon', icon.path);
			}
			return icon;
		},
		[iconList, setValue]
	);

	/**
	 * Get random color for new status
	 *
	 * @returns {string} - Random color
	 */
	const getRandomColor = useCallback(() => {
		const letters = '0123456789ABCDEF';
		let color = '#';
		for (let i = 0; i < 6; i++) {
			color += letters[Math.floor(Math.random() * 16)];
		}
		return color;
	}, []);

	useEffect(() => {
		if (!edit && selectedStatusType) {
			setRandomColor(getRandomColor());
		}
	}, [selectedStatusType, edit, getRandomColor]);

	return (
		<>
			<Modal isOpen={isOpen} closeModal={closeModal}>
				<SortTasksStatusSettings onClose={closeModal} arr={sortedArray} />
			</Modal>
			<form className="w-full" onSubmit={handleSubmit(onSubmit)} autoComplete="off">
				<div className={clsxm('grid grid-cols-1 gap-2', !formOnly && ROW)}>
					{!formOnly && <Text className={LABEL}>{t('pages.settingsTeam.TASK_STATUSES')}</Text>}

					<div className="flex min-w-0 flex-col gap-3">
						<div className="flex flex-wrap items-center gap-2">
							{!createNew && !edit && (
								<Tooltip label={readOnlyHint} enabled={!canCreate}>
									<Button
										variant="outline-dark"
										className={SECONDARY_BUTTON}
										disabled={!canCreate}
										onClick={() => {
											setEdit(null);
											setCreateNew(true);
										}}
									>
										<PlusIcon className="size-4" />
										{t('pages.settingsTeam.CREATE_NEW_STATUS')}
									</Button>
								</Tooltip>
							)}
							<Tooltip label={readOnlyHint} enabled={!canReorder}>
								<Button
									onClick={openModal}
									variant="outline-dark"
									className={SECONDARY_BUTTON}
									disabled={!canReorder}
								>
									{t('common.SORT')}
								</Button>
							</Tooltip>
						</div>
						{(createNew || edit) && (
							<>
								<Text className={SUB_LABEL}>
									{createNew && t('common.NEW')}
									{edit && t('common.EDIT')} {t('common.STATUSES')}
								</Text>
								<div className="flex w-full flex-wrap items-center gap-2">
									<InputField
										type="text"
										placeholder={t('pages.settingsTeam.CREATE_NEW_STATUS')}
										className="mb-0 h-9 w-full"
										wrapperClassName="mb-0 min-w-[12rem] flex-1 sm:max-w-xs"
										{...register('name')}
									/>
									<StandardTaskStatusDropDown
										onValueChange={(status) => {
											setValue('template', status);
											setSelectedStatusType(status);
										}}
										className="h-9 shrink-0"
										defaultValue={edit?.value}
									/>
									<div className={PICKER}>
										<IconPopover
											iconList={iconList}
											setValue={setValue}
											active={
												selectedStatusType
													? getIcon(selectedStatusType)
													: edit
														? (iconList.find((icon) => icon.path === edit.icon) as IIcon)
														: null
											}
										/>
									</div>
									<div className={PICKER}>
										<ColorPicker
											defaultColor={edit ? (edit.color ?? undefined) : randomColor}
											onChange={(color) => setValue('color', color)}
											className="shrink-0"
										/>
									</div>
								</div>
								<div className="flex flex-wrap gap-2">
									<Button
										variant="primary"
										className={PRIMARY_BUTTON}
										type="submit"
										disabled={createTaskStatusLoading || editTaskStatusLoading}
										loading={createTaskStatusLoading || editTaskStatusLoading}
										onClick={() => {
											setSelectedStatusType(null);
										}}
									>
										{edit ? t('common.SAVE') : t('common.CREATE')}
									</Button>
									{!formOnly && (
										<Button
											variant="grey"
											className={CANCEL_BUTTON}
											onClick={() => {
												setCreateNew(false);
												setEdit(null);
												setSelectedStatusType(null);
											}}
										>
											{t('common.CANCEL')}
										</Button>
									)}
								</div>
							</>
						)}

						{!formOnly && taskStatuses.length > 0 && (
							<>
								<Text className={clsxm(SUB_LABEL, 'pt-1')}>{t('pages.settingsTeam.LIST_OF_STATUSES')}</Text>
								<div className="flex w-full flex-wrap gap-2">
										{getTaskStatusesLoading && <Spinner dark={false} />}
										{!getTaskStatusesLoading && sortedArray.length ? (
											sortedArray.map((status) => (
												<StatusesListCard
													key={status.id}
													statusTitle={status.name ? status.name?.split('-').join(' ') : ''}
													bgColor={status.color || ''}
													statusIcon={status.fullIconUrl || ''}
													onEdit={() => {
														setCreateNew(false);
														setEdit(status);
													}}
													onDelete={async () => {
														try {
															const isStatusUsed = tasks.find(
																(t) =>
																	t.status?.toLowerCase() ===
																	status.name?.toLowerCase()
															);
															if (isStatusUsed) {
																setStatusToDelete(status);
																openDeleteConfirmationModal();
															} else {
																await deleteTaskStatus(status.id);

																// Update the task status state
																setTaskStatuses((prev) => {
																	return prev.filter((el) => el.id !== status.id);
																});
															}
														} catch (error) {
															console.error(error);
														}
													}}
													isStatus={true}
													readOnly={!canWriteRow(status)}
												/>
											))
										) : (
											<></>
										)}
									</div>
								</>
							)}
					</div>
				</div>
			</form>
			{statusToDelete && (
				<DeleteTaskStatusConfirmationModal
					onCancel={() => setStatusToDelete(null)}
					status={statusToDelete}
					open={isDeleteConfirmationOpen}
					closeModal={closeDeleteConfirmationModal}
				/>
			)}
		</>
	);
};
