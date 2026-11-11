/* eslint-disable no-mixed-spaces-and-tabs */
import { useTaskLabelsQuery } from '@/core/hooks/tasks/use-task-labels-query';
import { useCreateTaskLabel } from '@/core/hooks/tasks/use-create-task-label';
import { useEditTaskLabel } from '@/core/hooks/tasks/use-edit-task-label';
import { useDeleteTaskLabel } from '@/core/hooks/tasks/use-delete-task-label';

import { clsxm } from '@/core/lib/utils';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { Spinner } from '@/core/components/common/spinner';
import { Plus as PlusIcon } from '@/core/components/icons';
import { Button, Text } from '@/core/components';
import { useCallback, useEffect, useId, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';

import { defaultSwatchFor } from '@/core/lib/utils/settings-task-properties';
import { PropertyColorField } from '../settings/pages/task-properties/property-color-field';
import { PropertyPreview } from '../settings/pages/task-properties/property-preview';
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
const FIELD_LABEL = 'text-xs font-medium text-muted-foreground';

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
	const colorLabelId = useId();

	useEffect(() => {
		if (initialRender.current) {
			initialRender.current = false;
			// Gauzy requires a color for a label: a new one starts from a swatch instead of an empty value
			reset({
				name: '',
				color: defaultSwatchFor(taskLabels?.length ?? 0),
				icon: ''
			});
		}
	}, [reset, taskLabels?.length]);

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
							<InputField
								type="text"
								placeholder={t('pages.settingsTeam.CREATE_NEW_LABEL')}
								aria-label={t('common.NAME')}
								className="mb-0 h-9 w-full"
								wrapperClassName="mb-0 w-full"
								autoFocus={formOnly}
								{...register('name')}
							/>
							{/* A label is told apart by its color, so the form offers no icon (#5024) */}
							<div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:items-center">
								<span id={colorLabelId} className={FIELD_LABEL}>
									{t('settings.taskProperties.COLOR')}
								</span>
								<PropertyColorField
									value={formValues.color || null}
									onChange={(color) => setValue('color', color)}
									labelledBy={colorLabelId}
								/>
								<span className={FIELD_LABEL}>{t('settings.taskProperties.PREVIEW')}</span>
								<PropertyPreview
									kind="label"
									name={formValues.name ?? ''}
									color={formValues.color || null}
									placeholder={t('pages.settingsTeam.CREATE_NEW_LABEL')}
								/>
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
