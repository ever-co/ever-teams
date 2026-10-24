/* eslint-disable no-mixed-spaces-and-tabs */
import { useTaskLabelsQuery } from '@/core/hooks/tasks/use-task-labels-query';
import { useCreateTaskLabel } from '@/core/hooks/tasks/use-create-task-label';
import { useEditTaskLabel } from '@/core/hooks/tasks/use-edit-task-label';
import { useDeleteTaskLabel } from '@/core/hooks/tasks/use-delete-task-label';

import { clsxm } from '@/core/lib/utils';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { Spinner } from '@/core/components/common/spinner';
import { PlusIcon } from '@heroicons/react/20/solid';
import { Button, ColorPicker, Text } from '@/core/components';
import { useCallback, useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';

import { generateIconList, IIcon } from '../settings/icon-items';
import IconPopover from '../settings/icon-popover';
import { StatusesListCard } from '../settings/list-card';
import { InputField } from '../duplicated-components/_input';
import { ITag } from '@/core/types/interfaces/tag/tag';

// Settings row (label column + content) and the compact controls of the issue-settings blocks.
const ROW = 'sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4';
const LABEL = 'text-sm font-medium text-muted-foreground sm:pt-2';
const SUB_LABEL = 'text-xs font-medium text-muted-foreground';
const SECONDARY_BUTTON =
	'h-9 shrink-0 gap-1.5 rounded-md bg-card px-3 py-0 text-sm font-medium text-foreground hover:bg-muted';
const PRIMARY_BUTTON = 'h-9 shrink-0 rounded-md px-3 py-0 text-sm font-medium hover:bg-primary/90';
const CANCEL_BUTTON = 'h-9 shrink-0 rounded-md px-3 py-0 text-sm font-medium';
// The icon and colour pickers draw their own 54px box; this sizes them like the other controls of the
// row without touching the shared picker components.
const PICKER = 'shrink-0 [&_.input-border]:h-9 [&_.input-border]:rounded-md [&_.rounded-xl]:h-9 [&_.rounded-xl]:rounded-md';

type StatusForm = {
	formOnly?: boolean;
	onCreated?: () => void;
};

export const TaskLabelForm = ({ formOnly = false, onCreated }: StatusForm) => {
	const { data: user } = useUserQuery();
	const { register, setValue, handleSubmit, reset, watch } = useForm();
	const [edit, setEdit] = useState<ITag | null>(null);
	const [isCreating, setIsCreating] = useState(formOnly);
	const t = useTranslations();
	const initialRender = useRef(true);
	const { taskLabels, loading } = useTaskLabelsQuery();
	const { createTaskLabels, createTaskLabelsLoading } = useCreateTaskLabel();
	const { editTaskLabels, editTaskLabelsLoading } = useEditTaskLabel();
	const { deleteTaskLabels } = useDeleteTaskLabel();

	const formValues = watch();

	const taskStatusIconList: IIcon[] = generateIconList('task-statuses', [
		'open',
		'in-progress',
		'ready',
		'in-review',
		'blocked',
		'completed'
	]);
	const taskSizesIconList: IIcon[] = generateIconList('task-sizes', ['x-large']);
	const taskPrioritiesIconList: IIcon[] = generateIconList('task-priorities', ['urgent', 'high', 'medium', 'low']);
	const iconList: IIcon[] = [...taskStatusIconList, ...taskSizesIconList, ...taskPrioritiesIconList];

	useEffect(() => {
		if (initialRender.current) {
			initialRender.current = false;
			reset({
				name: '',
				color: '',
				icon: ''
			});
		}
	}, [reset]);

	useEffect(() => {
		if (edit) {
			reset({
				name: edit.name?.split('-').join(' ') || '',
				color: edit.color || '',
				icon: edit.icon || ''
			});
		}
	}, [edit, reset]);

	const onSubmit = useCallback(
		async (values: any) => {
			if (isCreating) {
				await createTaskLabels({
					name: values.name,
					color: values.color,
					organizationId: user?.employee?.organizationId,
					tenantId: user?.tenantId,
					icon: values.icon
				});
				if (!formOnly) setIsCreating(false);
				onCreated?.();
				reset();
			} else if (edit) {
				await editTaskLabels({
					id: edit.id,
					data: {
						name: values.name,
						color: values.color,
						icon: values.icon
					}
				});
				setEdit(null);
			}
		},
		[isCreating, edit, formOnly, onCreated, reset, createTaskLabels, editTaskLabels, user]
	);

	return (
		<form className="z-50 w-full" onSubmit={handleSubmit(onSubmit)} autoComplete="off">
			<div className={clsxm('grid grid-cols-1 gap-2', !formOnly && ROW)}>
				{!formOnly && <Text className={LABEL}>{t('pages.settingsTeam.TASK_LABELS')}</Text>}

				<div className="flex min-w-0 flex-col gap-3">
					{!isCreating && !edit && (
						<div className="flex flex-wrap items-center gap-2">
							<Button
								variant="outline-dark"
								className={SECONDARY_BUTTON}
								onClick={() => {
									setEdit(null);
									setIsCreating(true);
								}}
							>
								<PlusIcon className="size-4" />
								{t('pages.settingsTeam.CREATE_NEW_LABEL')}
							</Button>
						</div>
					)}

					{(isCreating || edit) && (
						<>
							<Text className={SUB_LABEL}>
								{isCreating && t('common.NEW')}
								{edit && t('common.EDIT')} {t('common.LABEL')}
							</Text>
							<div className="flex w-full flex-wrap items-center gap-2">
								<InputField
									type="text"
									placeholder={t('pages.settingsTeam.CREATE_NEW_LABEL')}
									className="mb-0 h-9 w-full"
									wrapperClassName="mb-0 min-w-[12rem] flex-1 sm:max-w-xs"
									{...register('name')}
								/>

								<div className={PICKER}>
									<IconPopover
										iconList={iconList}
										setValue={setValue}
										active={
											edit ? (iconList.find((icon) => icon.path === edit.icon) as IIcon) : null
										}
									/>
								</div>

								<div className={PICKER}>
									<ColorPicker
										defaultColor={edit ? edit.color : formValues.color}
										onChange={(color) => setValue('color', color)}
									/>
								</div>
							</div>
							<div className="flex flex-wrap gap-2">
								<Button
									variant="primary"
									className={PRIMARY_BUTTON}
									type="submit"
									disabled={createTaskLabelsLoading || editTaskLabelsLoading}
									loading={createTaskLabelsLoading || editTaskLabelsLoading}
								>
									{edit ? t('common.SAVE') : t('common.CREATE')}
								</Button>

								{!formOnly && (
									<Button
										variant="grey"
										className={CANCEL_BUTTON}
										onClick={() => {
											setIsCreating(false);
											setEdit(null);
										}}
									>
										{t('common.CANCEL')}
									</Button>
								)}
							</div>
						</>
					)}

					{!formOnly && taskLabels?.length > 0 && (
						<>
							<Text className={clsxm(SUB_LABEL, 'pt-1')}>{t('pages.settingsTeam.LIST_OF_LABELS')}</Text>
							<div className="flex w-full flex-wrap gap-2">
								{loading && !taskLabels?.length && <Spinner dark={false} />}
								{taskLabels?.map((label: any) => (
									<StatusesListCard
										key={label.id}
										statusTitle={label.name?.split('-').join(' ') || ''}
										bgColor={label.color || ''}
										statusIcon={label.fullIconUrl || ''}
										onEdit={() => setEdit(label)}
										onDelete={() => deleteTaskLabels(label.id)}
									/>
								))}
							</div>
						</>
					)}
				</div>
			</div>
		</form>
	);
};
