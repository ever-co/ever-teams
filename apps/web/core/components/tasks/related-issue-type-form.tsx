/* eslint-disable no-mixed-spaces-and-tabs */
import { Button, Text } from '@/core/components';
import { useTranslations } from 'next-intl';
import { StatusesListCard } from '../settings/list-card';

import { useRefetchData } from '@/core/hooks';
import { useTaskRelatedIssueTypesQuery } from '@/core/hooks/tasks/use-task-related-issue-types-query';
import { useCreateTaskRelatedIssueType } from '@/core/hooks/tasks/use-create-task-related-issue-type';
import { useEditTaskRelatedIssueType } from '@/core/hooks/tasks/use-edit-task-related-issue-type';
import { useDeleteTaskRelatedIssueType } from '@/core/hooks/tasks/use-delete-task-related-issue-type';
import { Spinner } from '@/core/components/common/spinner';
import { PlusIcon } from '@heroicons/react/20/solid';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { InputField } from '../duplicated-components/_input';
import { ITaskRelatedIssueType } from '@/core/types/interfaces/task/related-issue-type';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';

// Settings row (label column + content) and the compact controls of the issue-settings blocks.
const ROW = 'grid grid-cols-1 gap-2 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4';
const LABEL = 'text-sm font-medium text-muted-foreground sm:pt-2';
const SUB_LABEL = 'text-xs font-medium text-muted-foreground';
const SECONDARY_BUTTON =
	'h-9 shrink-0 gap-1.5 rounded-md bg-card px-3 py-0 text-sm font-medium text-foreground hover:bg-muted';
const PRIMARY_BUTTON = 'h-9 shrink-0 rounded-md px-3 py-0 text-sm font-medium hover:bg-primary/90';
const CANCEL_BUTTON = 'h-9 shrink-0 rounded-md px-3 py-0 text-sm font-medium';

export const RelatedIssueTypeForm =({ formOnly = false } = {}) => {
	const t = useTranslations();

	const { data: user } = useUserQuery();
	const { register, setValue, handleSubmit, reset } = useForm();
	const [createNew, setCreateNew] = useState(formOnly);
	const [edit, setEdit] = useState<ITaskRelatedIssueType | null>(null);

	const { taskRelatedIssueTypes, loading } = useTaskRelatedIssueTypesQuery();
	const { createTaskRelatedIssueType, createTaskRelatedIssueTypeLoading } = useCreateTaskRelatedIssueType();
	const { editTaskRelatedIssueType, editTaskRelatedIssueTypeLoading } = useEditTaskRelatedIssueType();
	const { deleteTaskRelatedIssueType } = useDeleteTaskRelatedIssueType();
	const { refetch } = useRefetchData();

	useEffect(() => {
		if (!edit) {
			setValue('name', '');
		}
	}, [edit, setValue]);

	useEffect(() => {
		if (edit) {
			setValue('name', edit.name);
		} else {
			setValue('name', '');
		}
	}, [
		edit,
		setValue,
		createTaskRelatedIssueType,
		editTaskRelatedIssueType,
		user?.employee?.organizationId,
		user?.tenantId
	]);

	const onSubmit = useCallback(
		async (values: any) => {
			if (createNew) {
				createTaskRelatedIssueType({
					name: values.name,
					// color: values.color,
					// description: '',
					organizationId: user?.employee?.organizationId,
					tenantId: user?.tenantId
					// icon: values.icon,
					// projectId: '',
				})?.then(() => {
					!formOnly && setCreateNew(false);

					refetch();
					reset();
				});
			}
			if (edit && values.name !== edit.name?.split('-').join(' ')) {
				editTaskRelatedIssueType(edit.id, {
					name: values.name
					// color: values.color,
					// icon: values.icon,
				})?.then(() => {
					setEdit(null);
					refetch();
				});
			}
		},
		[edit, formOnly, createNew, editTaskRelatedIssueType, user, reset, createTaskRelatedIssueType, refetch]
	);

	return (
		<>
			<form className="w-full" onSubmit={handleSubmit(onSubmit)} autoComplete="off">
				<div className={ROW}>
					<Text className={LABEL}>{t('pages.settingsTeam.RELATED_ISSUE_TYPE')}</Text>

					<div className="flex min-w-0 flex-col gap-3">
						{!createNew && !edit && (
							<div className="flex flex-wrap items-center gap-2">
								<Button
									variant="outline-dark"
									className={SECONDARY_BUTTON}
									onClick={() => {
										setEdit(null);
										setCreateNew(true);
									}}
								>
									<PlusIcon className="size-4" />
									{t('pages.settingsTeam.CREATE_NEW_ISSUE_TYPES')}
								</Button>
							</div>
						)}

						{(createNew || edit) && (
							<>
								<Text className={SUB_LABEL}>
									{createNew && 'New'}
									{edit && 'Edit'} {t('pages.settingsTeam.RELATED_TYPE')}
								</Text>
								<div className="flex w-full flex-wrap items-center gap-2">
									<InputField
										type="text"
										placeholder={t('pages.settingsTeam.CREATE_NEW_ISSUE_TYPES')}
										className="mb-0 h-9 w-full"
										wrapperClassName="mb-0 min-w-[12rem] flex-1 sm:max-w-xs"
										{...register('name')}
									/>
								</div>
								<div className="flex flex-wrap gap-2">
									<Button
										variant="primary"
										className={PRIMARY_BUTTON}
										type="submit"
										disabled={createTaskRelatedIssueTypeLoading || editTaskRelatedIssueTypeLoading}
										loading={createTaskRelatedIssueTypeLoading || editTaskRelatedIssueTypeLoading}
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
											Cancel
										</Button>
									)}
								</div>
							</>
						)}

						{!formOnly && taskRelatedIssueTypes?.length > 0 && (
							<>
								<Text className={`${SUB_LABEL} pt-1`}>{t('pages.settingsTeam.LIST_OF_RELATED_TYPE')}</Text>
								<div className="flex w-full flex-wrap gap-2">
									{loading && !taskRelatedIssueTypes?.length && <Spinner dark={false} />}
									{taskRelatedIssueTypes && taskRelatedIssueTypes?.length ? (
										taskRelatedIssueTypes.map((relatedIssueType) => (
											<StatusesListCard
												key={relatedIssueType.id}
												statusTitle={
													relatedIssueType.name
														? relatedIssueType.name?.split('-').join(' ')
														: ''
												}
												bgColor={''}
												statusIcon={''}
												onEdit={() => {
													setCreateNew(false);
													setEdit(relatedIssueType);
												}}
												onDelete={() => {
													deleteTaskRelatedIssueType(relatedIssueType.id);
												}}
												isStatus={true}
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
