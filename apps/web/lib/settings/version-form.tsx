/* eslint-disable no-mixed-spaces-and-tabs */
import { Button, InputField, Text } from 'lib/components';
import { StatusesListCard } from './list-card';

import { useTaskVersion } from '@app/hooks';
import { ITaskVersionCreate, ITaskVersionItemList } from '@app/interfaces';
import { userState } from '@app/stores';
import { Spinner } from '@components/ui/loaders/spinner';
import { PlusIcon } from '@heroicons/react/20/solid';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRecoilState } from 'recoil';

import { useRefetchData } from '@app/hooks';
import { clsxm } from '@app/utils';
import { useTranslation } from 'next-i18next';

type StatusForm = {
	formOnly?: boolean;
	onCreated?: () => void;
	onVersionCreated?: (version: ITaskVersionCreate) => void;
};

export const VersionForm = ({ formOnly = false, onCreated, onVersionCreated }: StatusForm) => {
	const { t } = useTranslation();

	const [user] = useRecoilState(userState);
	const { register, setValue, handleSubmit, reset, getValues } = useForm();
	const [createNew, setCreateNew] = useState(formOnly);
	const [edit, setEdit] = useState<ITaskVersionItemList | null>(null);

	const {
		loading,
		taskVersion,
		createTaskVersion,
		deleteTaskVersion,
		editTaskVersion,
		createTaskVersionLoading,
		editTaskVersionLoading
	} = useTaskVersion(onVersionCreated);
	const { refetch } = useRefetchData();

	useEffect(() => {
		if (!edit && !getValues().name) {
			setValue('name', '');
		}
	}, [taskVersion, edit, setValue, getValues]);

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
					organizationId: user?.employee?.organizationId,
					tenantId: user?.tenantId
					// icon: values.icon,
					// projectId: '',
				})?.then(() => {
					!formOnly && setCreateNew(false);

					onCreated && onCreated();
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
		[edit, createNew, formOnly, onCreated, editTaskVersion, user, reset, createTaskVersion, refetch]
	);

	return (
		<>
			<form className="w-full" onSubmit={handleSubmit(onSubmit)} autoComplete="off">
				<div className="flex w-full">
					<div className="rounded-md m-h-64 p-[32px] pl-0 pr-0 flex gap-x-[2rem] w-full">
						{!formOnly && (
							<Text className="flex-none flex-grow-0 text-gray-400 text-lg font-normal mb-2 w-[200px]">
								{t('pages.settingsTeam.VERSIONS')}
							</Text>
						)}

						<div className="flex flex-col items-center w-full sm:items-start">
							{!createNew && !edit && (
								<Button
									variant="outline"
									className="font-normal justify-center border-2 rounded-[10px] text-md w-[230px] gap-2 h-[46px]"
									onClick={() => {
										setEdit(null);
										setCreateNew(true);
									}}
								>
									<PlusIcon className=" font-normal w-[16px] h-[16px]" />
									{t('pages.settingsTeam.CREATE_NEW_VERSION')}
								</Button>
							)}

							{(createNew || edit) && (
								<>
									<Text className="flex-none flex-grow-0 mb-2 text-lg font-normal text-gray-400">
										{createNew && 'New'}
										{edit && t('common.EDIT')} {t('common.VERSION')}
									</Text>
									<div
										className={clsxm(
											'flex w-full gap-x-5 items-center mt-3',
											formOnly && ['flex-wrap space-y-2']
										)}
									>
										<InputField
											type="text"
											placeholder={t('pages.settingsTeam.CREATE_NEW_VERSION')}
											className="mb-0 min-w-[350px]"
											wrapperClassName="mb-0 rounded-lg"
											{...register('name')}
										/>
									</div>
									<div className="flex mt-5 gap-x-4">
										<Button
											variant="primary"
											className="px-4 py-4 font-normal rounded-xl text-md"
											type="submit"
											disabled={createTaskVersionLoading || editTaskVersionLoading}
											loading={createTaskVersionLoading || editTaskVersionLoading}
										>
											{edit ? t('common.SAVE') : t('common.CREATE')}
										</Button>

										{!formOnly && (
											<Button
												variant="grey"
												className="px-4 py-4 font-normal rounded-xl text-md"
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

							{!formOnly && taskVersion?.length > 0 && (
								<>
									<Text className="flex-none flex-grow-0 text-gray-400 text-lg font-normal mb-[1rem] w-full mt-[2.4rem] text-center sm:text-left">
										{t('pages.settingsTeam.LIST_OF_VERSONS')}
									</Text>
									<div className="flex flex-wrap justify-center w-full gap-3 sm:justify-start">
										{loading && !taskVersion?.length && <Spinner dark={false} />}
										{taskVersion && taskVersion?.length ? (
											taskVersion.map((version) => (
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
													className="dark:text-gray-100"
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
				</div>
			</form>
		</>
	);
};
