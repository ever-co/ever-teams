/* eslint-disable no-mixed-spaces-and-tabs */
import { Button, InputField, Text } from 'lib/components';
import { useTranslations } from 'next-intl';
import { StatusesListCard } from './list-card';

import { useRefetchData, useTaskRelatedIssueType } from '@app/hooks';
import { ITaskRelatedIssueTypeItemList } from '@app/interfaces';
import { userState } from '@app/stores';
import { Spinner } from '@components/ui/loaders/spinner';
import { PlusIcon } from '@heroicons/react/20/solid';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRecoilState } from 'recoil';

export const RelatedIssueTypeForm = ({ formOnly = false } = {}) => {
	const t = useTranslations();

	const [user] = useRecoilState(userState);
	const { register, setValue, handleSubmit, reset } = useForm();
	const [createNew, setCreateNew] = useState(formOnly);
	const [edit, setEdit] = useState<ITaskRelatedIssueTypeItemList | null>(null);

	const {
		loading,
		taskRelatedIssueType,
		createTaskRelatedIssueType,
		deleteTaskRelatedIssueType,
		editTaskRelatedIssueType,
		createTaskRelatedIssueTypeLoading,
		editTaskRelatedIssueTypeLoading
	} = useTaskRelatedIssueType();
	const { refetch } = useRefetchData();

	useEffect(() => {
		if (!edit) {
			setValue('name', '');
		}
	}, [taskRelatedIssueType, edit, setValue]);

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
				<div className="flex w-full">
					<div className="rounded-md m-h-64 p-[32px] pl-0 pr-0 flex gap-x-[2rem] w-full">
						<Text className="flex-none flex-grow-0 text-gray-400 text-lg font-normal mb-2 w-[200px]">
							{t('pages.settingsTeam.RELATED_ISSUE_TYPE')}
						</Text>

						<div className="flex flex-col w-f">
							{!createNew && !edit && (
								<Button
									variant="outline"
									className="font-normal justify-center border-2 rounded-[10px] text-md w-[230px] gap-2 h-[46px]"
									onClick={() => {
										setEdit(null);
										setCreateNew(true);
									}}
								>
									<PlusIcon className="font-normal w-[16px] h-[16px]" />
									{t('pages.settingsTeam.CREATE_NEW_ISSUE_TYPES')}
								</Button>
							)}

							{(createNew || edit) && (
								<>
									<Text className="flex-none flex-grow-0 mb-2 text-lg font-normal text-gray-400">
										{createNew && 'New'}
										{edit && 'Edit'} {t('pages.settingsTeam.RELATED_TYPE')}
									</Text>
									<div className="flex items-center w-full mt-3 gap-x-5">
										<InputField
											type="text"
											placeholder={t('pages.settingsTeam.CREATE_NEW_ISSUE_TYPES')}
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
											disabled={
												createTaskRelatedIssueTypeLoading || editTaskRelatedIssueTypeLoading
											}
											loading={
												createTaskRelatedIssueTypeLoading || editTaskRelatedIssueTypeLoading
											}
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
												Cancel
											</Button>
										)}
									</div>
								</>
							)}

							{!formOnly && taskRelatedIssueType?.length > 0 && (
								<>
									<Text className="flex-none flex-grow-0 text-gray-400 text-lg font-normal mb-[1rem] w-full mt-[2.4rem]">
										{t('pages.settingsTeam.LIST_OF_RELATED_TYPE')}
									</Text>
									<div className="flex flex-wrap justify-center w-full gap-3 sm:justify-start">
										{loading && !taskRelatedIssueType?.length && <Spinner dark={false} />}
										{taskRelatedIssueType && taskRelatedIssueType?.length ? (
											taskRelatedIssueType.map((relatedIssueType) => (
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
				</div>
			</form>
		</>
	);
};
