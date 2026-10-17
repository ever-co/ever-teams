import { Button, Text } from '@/core/components';
import { StatusesListCard } from '../settings/list-card';

import { useCallbackRef } from '@/core/hooks';
import { useTaskVersionsQuery } from '@/core/hooks/tasks/use-task-versions-query';
import { useCreateTaskVersion } from '@/core/hooks/tasks/use-create-task-version';
import { useEditTaskVersion } from '@/core/hooks/tasks/use-edit-task-version';
import { useDeleteTaskVersion } from '@/core/hooks/tasks/use-delete-task-version';
import { Spinner } from '@/core/components/common/spinner';
import { PlusIcon } from '@heroicons/react/20/solid';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { useRefetchData } from '@/core/hooks';
import { clsxm } from '@/core/lib/utils';
import { useTranslations } from 'next-intl';
import { InputField } from '../duplicated-components/_input';
import { TTaskVersion } from '@/core/types/schemas';
import { getActiveTeamIdCookie, getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';

// Settings row (label column + content) and the compact controls of the issue-settings blocks.
const ROW = 'sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4';
const LABEL = 'text-sm font-medium text-muted-foreground sm:pt-2';
const SUB_LABEL = 'text-xs font-medium text-muted-foreground';
const SECONDARY_BUTTON =
	'h-9 shrink-0 gap-1.5 rounded-md bg-card px-3 py-0 text-sm font-medium text-foreground hover:bg-muted';
const PRIMARY_BUTTON = 'h-9 shrink-0 rounded-md px-3 py-0 text-sm font-medium hover:bg-primary/90';
const CANCEL_BUTTON = 'h-9 shrink-0 rounded-md px-3 py-0 text-sm font-medium';

type StatusForm = {
	formOnly?: boolean;
	onCreated?: () => void;
	onVersionCreated?: (version: TTaskVersion) => void;
};

export const TaskVersionForm = ({ formOnly = false, onCreated, onVersionCreated }: StatusForm) => {
	const t = useTranslations();
	const tenantId = getTenantIdCookie();
	const activeTeamId = getActiveTeamIdCookie();
	const { data: user } = useUserQuery();
	const { register, setValue, handleSubmit, reset, getValues } = useForm();
	const [createNew, setCreateNew] = useState(formOnly);
	const [edit, setEdit] = useState<TTaskVersion | null>(null);
	const $onVersionCreated = useCallbackRef(onVersionCreated);
	const organizationId = getOrganizationIdCookie();

	const { loading, taskVersions } = useTaskVersionsQuery();
	const { createTaskVersion, createTaskVersionLoading } = useCreateTaskVersion();
	const { editTaskVersion, editTaskVersionLoading } = useEditTaskVersion();
	const { deleteTaskVersion } = useDeleteTaskVersion();
	const { refetch } = useRefetchData();

	useEffect(() => {
		if (!edit && !getValues().name) {
			setValue('name', '');
		}
	}, [taskVersions, edit, setValue, getValues]);

	useEffect(() => {
		if (edit) {
			setValue('name', edit.name?.split('-').join(' '));
		} else {
			setValue('name', '');
		}
	}, [edit, setValue, createTaskVersion, editTaskVersion, user?.employee?.organizationId, user?.tenantId]);

	const onSubmit = useCallback(
		async (values: any) => {
			if (createNew) {
				createTaskVersion({
					name: values.name,
					color: '#FFFFFF',
					// description: '',
					organizationId: organizationId,
					organizationTeamId: activeTeamId,
					tenantId
					// icon: values.icon,
					// projectId: '',
				})?.then((res: any) => {
					!formOnly && setCreateNew(false);

					onCreated && onCreated();
					$onVersionCreated.current && $onVersionCreated.current(res.data);
					refetch();
					reset();
				});
			}
			if (edit && values.name !== edit.name?.split('-').join(' ')) {
				editTaskVersion(edit.id, {
					name: values.name
					// color: values.color,
					// icon: values.icon,
				})?.then(() => {
					refetch();
					setEdit(null);
				});
			}
		},
		[
			edit,
			createNew,
			formOnly,
			onCreated,
			editTaskVersion,
			user,
			reset,
			createTaskVersion,
			refetch,
			$onVersionCreated
		]
	);

	return (
		<>
			<form className="w-full" onSubmit={handleSubmit(onSubmit)} autoComplete="off">
				<div className={clsxm('grid grid-cols-1 gap-2', !formOnly && ROW)}>
					{!formOnly && <Text className={LABEL}>{t('pages.settingsTeam.VERSIONS')}</Text>}

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
									{t('pages.settingsTeam.CREATE_NEW_VERSION')}
								</Button>
							</div>
						)}

						{(createNew || edit) && (
							<>
								<Text className={SUB_LABEL}>
									{createNew && 'New'}
									{edit && t('common.EDIT')} {t('common.VERSION')}
								</Text>
								<div className="flex w-full flex-wrap items-center gap-2">
									<InputField
										type="text"
										placeholder={t('pages.settingsTeam.CREATE_NEW_VERSION')}
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
										disabled={createTaskVersionLoading || editTaskVersionLoading}
										loading={createTaskVersionLoading || editTaskVersionLoading}
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

						{!formOnly && taskVersions?.length > 0 && (
							<>
								<Text className={clsxm(SUB_LABEL, 'pt-1')}>{t('pages.settingsTeam.LIST_OF_VERSONS')}</Text>
								<div className="flex w-full flex-wrap gap-2">
									{loading && !taskVersions?.length && <Spinner dark={false} />}
									{taskVersions && taskVersions?.length ? (
										taskVersions.map((version) => (
											<StatusesListCard
												key={version.id}
												statusTitle={version.name ? version.name?.split('-').join(' ') : ''}
												bgColor={''}
												statusIcon={''}
												onEdit={() => {
													setCreateNew(false);
													setEdit(version);
												}}
												onDelete={() => {
													deleteTaskVersion(version.id);
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
