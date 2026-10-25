/* eslint-disable no-mixed-spaces-and-tabs */
import { useRefetchData } from '@/core/hooks';
import { useTaskPrioritiesQuery } from '@/core/hooks/tasks/use-task-priorities-query';
import { useCreateTaskPriority } from '@/core/hooks/tasks/use-create-task-priority';
import { useEditTaskPriority } from '@/core/hooks/tasks/use-edit-task-priority';
import { useDeleteTaskPriority } from '@/core/hooks/tasks/use-delete-task-priority';
import { useTaskSettingsAccess } from '@/core/hooks/tasks/use-task-settings-access';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { Button, ColorPicker, Text } from '@/core/components';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { StatusesListCard } from '../settings/list-card';

import { clsxm } from '@/core/lib/utils';
import { Spinner } from '@/core/components/common/spinner';
import { PlusIcon } from '@heroicons/react/20/solid';
import { useTranslations } from 'next-intl';
import { generateIconList, IIcon } from '../settings/icon-items';
import IconPopover from '../settings/icon-popover';
import { InputField } from '../duplicated-components/_input';
import { Tooltip } from '../duplicated-components/tooltip';
import { TTaskPriority } from '@/core/types/schemas';

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

export const TaskPrioritiesForm = ({ formOnly = false, onCreated }: StatusForm) => {
	const { data: user } = useUserQuery();
	const { register, setValue, handleSubmit, reset, getValues } = useForm();
	const [createNew, setCreateNew] = useState(formOnly);
	const [edit, setEdit] = useState<TTaskPriority | null>(null);
	const t = useTranslations();

	const taskStatusIconList: IIcon[] = generateIconList('task-statuses', [
		'open',
		'in-progress',
		'ready',
		'in-review',
		'blocked',
		'completed'
	]);
	const taskSizesIconList: IIcon[] = generateIconList('task-sizes', [
		'x-large'
		// 'large',
		// 'medium',
		// 'small',
		// 'tiny',
	]);
	const taskPrioritiesIconList: IIcon[] = generateIconList('task-priorities', ['urgent', 'high', 'medium', 'low']);

	const iconList: IIcon[] = [...taskStatusIconList, ...taskSizesIconList, ...taskPrioritiesIconList];

	const { taskPriorities, loading } = useTaskPrioritiesQuery();
	const { createTaskPriorities, createTaskPrioritiesLoading } = useCreateTaskPriority();
	const { editTaskPriorities, editTaskPrioritiesLoading } = useEditTaskPriority();
	const { deleteTaskPriorities } = useDeleteTaskPriority();
	const { refetch } = useRefetchData();
	const { canCreate, canWriteRow, readOnlyHint } = useTaskSettingsAccess();

	useEffect(() => {
		if (!edit && !getValues().name) {
			setValue('name', '');
			setValue('color', '');
			setValue('icon', '');
		}
	}, [edit, setValue, getValues]);

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
	}, [edit, setValue]);

	const onSubmit = useCallback(
		async (values: any) => {
			if (createNew) {
				createTaskPriorities({
					name: values.name,
					color: values.color,
					// description: '',
					organizationId: user?.employee?.organizationId,
					tenantId: user?.tenantId,
					icon: values.icon
					// projectId: '',
				})?.then(() => {
					!formOnly && setCreateNew(false);

					onCreated && onCreated();
					refetch();
					reset();
				});
			}
			if (
				edit &&
				(values.name !== edit.name?.split('-').join(' ') ||
					values.color !== edit.color ||
					values.icon !== edit.icon)
			) {
				editTaskPriorities(edit.id, {
					name: values.name,
					color: values.color,
					icon: values.icon
				})?.then(() => {
					setEdit(null);
					refetch();
				});
			}
		},
		[edit, createNew, formOnly, editTaskPriorities, onCreated, user, reset, createTaskPriorities, refetch]
	);

	return (
		<>
			<form className="w-full" onSubmit={handleSubmit(onSubmit)} autoComplete="off">
				<div className={clsxm('grid grid-cols-1 gap-2', !formOnly && ROW)}>
					{!formOnly && <Text className={LABEL}>{t('pages.settingsTeam.TASK_PRIORITIES')}</Text>}

					<div className="flex min-w-0 flex-col gap-3">
						{!createNew && !edit && (
							<div className="flex flex-wrap items-center gap-2">
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
										{t('pages.settingsTeam.CREATE_NEW_PRIORITY')}
									</Button>
								</Tooltip>
							</div>
						)}

						{(createNew || edit) && (
							<>
								<Text className={SUB_LABEL}>
									{createNew && t('common.NEW')}
									{edit && t('common.EDIT')} {t('pages.settingsTeam.PRIORITIES_HEADING')}
								</Text>
								<div className="flex w-full flex-wrap items-center gap-2">
									<InputField
										type="text"
										placeholder={t('pages.settingsTeam.CREATE_NEW_PRIORITY')}
										className="mb-0 h-9 w-full"
										wrapperClassName="mb-0 min-w-[12rem] flex-1 sm:max-w-xs"
										{...register('name')}
									/>

									<div className={PICKER}>
										<IconPopover
											iconList={iconList}
											setValue={setValue}
											active={
												edit
													? (iconList.find((icon) => icon.path === edit.icon) as IIcon)
													: null
											}
										/>
									</div>

									<div className={PICKER}>
										<ColorPicker
											defaultColor={edit ? (edit.color ?? undefined) : undefined}
											onChange={(color) => setValue('color', color)}
										/>
									</div>
								</div>
								<div className="flex flex-wrap gap-2">
									<Button
										variant="primary"
										className={PRIMARY_BUTTON}
										type="submit"
										disabled={createTaskPrioritiesLoading || editTaskPrioritiesLoading}
										loading={createTaskPrioritiesLoading || editTaskPrioritiesLoading}
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
											}}
										>
											{t('common.CANCEL')}
										</Button>
									)}
								</div>
							</>
						)}

						{!formOnly && taskPriorities?.length > 0 && (
							<>
								<Text className={clsxm(SUB_LABEL, 'pt-1')}>{t('pages.settingsTeam.LIST_OF_PRIORITIES')}</Text>
								<div className="flex w-full flex-wrap gap-2">
									{loading && !taskPriorities?.length && <Spinner dark={false} />}
									{taskPriorities && taskPriorities?.length ? (
										taskPriorities.map((priority) => (
											<StatusesListCard
												statusTitle={priority?.name ? priority?.name?.split('-').join(' ') : ''}
												bgColor={priority?.color || ''}
												statusIcon={priority?.fullIconUrl || ''}
												onEdit={() => {
													setCreateNew(false);
													setEdit(priority);
												}}
												onDelete={() => {
													deleteTaskPriorities(priority?.id);
												}}
												readOnly={!canWriteRow(priority)}
												key={priority?.id}
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
		</>
	);
};
