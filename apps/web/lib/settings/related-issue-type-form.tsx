/* eslint-disable no-mixed-spaces-and-tabs */
import { Button, InputField, Text } from 'lib/components';
import { StatusesListCard } from './list-card';
import { useTranslation } from 'lib/i18n';

import { useForm } from 'react-hook-form';
import { useCallback, useEffect, useState } from 'react';
import { userState } from '@app/stores';
import { useRecoilState } from 'recoil';
import { PlusIcon } from '@heroicons/react/20/solid';
import { useTaskRelatedIssueType } from '@app/hooks';
import { Spinner } from '@components/ui/loaders/spinner';
import { ITaskRelatedIssueTypeItemList } from '@app/interfaces';
import { useRefetchData } from '@app/hooks';

export const RelatedIssueTypeForm = ({ formOnly = false } = {}) => {
	const { trans } = useTranslation('settingsTeam');

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
		editTaskRelatedIssueTypeLoading,
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
		user?.tenantId,
	]);

	const onSubmit = useCallback(
		async (values: any) => {
			if (createNew) {
				createTaskRelatedIssueType({
					name: values.name,
					// color: values.color,
					// description: '',
					organizationId: user?.employee?.organizationId,
					tenantId: user?.tenantId,
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
					name: values.name,
					// color: values.color,
					// icon: values.icon,
				})?.then(() => {
					setEdit(null);
					refetch();
				});
			}
		},
		[
			edit,
			formOnly,
			createNew,
			editTaskRelatedIssueType,
			user,
			reset,
			createTaskRelatedIssueType,
			refetch,
		]
	);

	return (
		<>
			<form
				className="w-full"
				onSubmit={handleSubmit(onSubmit)}
				autoComplete="off"
			>
				<div className="flex w-full">
					<div className="rounded-md m-h-64 p-[32px] pl-0 pr-0 flex gap-x-[2rem] w-full">
						<Text className="flex-none flex-grow-0 text-gray-400 text-lg font-normal mb-2 w-[200px]">
							{trans.RELATED_ISSUE_TYPE}
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
									{trans.CREATE_NEW_ISSUE_TYPES}
								</Button>
							)}

							{(createNew || edit) && (
								<>
									<Text className="flex-none flex-grow-0 text-gray-400 text-lg font-normal mb-2">
										{createNew && 'New'}
										{edit && 'Edit'} {trans.RELATED_TYPE}
									</Text>
									<div className="flex  w-full gap-x-5 items-center mt-3">
										<InputField
											type="text"
											placeholder={trans.CREATE_NEW_ISSUE_TYPES}
											className="mb-0 min-w-[350px]"
											wrapperClassName="mb-0 rounded-lg"
											{...register('name')}
										/>
									</div>
									<div className="flex gap-x-4 mt-5">
										<Button
											variant="primary"
											className="font-normal py-4 px-4 rounded-xl text-md"
											type="submit"
											disabled={
												createTaskRelatedIssueTypeLoading ||
												editTaskRelatedIssueTypeLoading
											}
											loading={
												createTaskRelatedIssueTypeLoading ||
												editTaskRelatedIssueTypeLoading
											}
										>
											{edit ? 'Save' : 'Create'}
										</Button>

										{!formOnly && (
											<Button
												variant="grey"
												className="font-normal py-4 px-4 rounded-xl text-md"
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
										{trans.LIST_OF_RELATED_TYPE}
									</Text>
									<div className="flex flex-wrap w-full gap-3 justify-center sm:justify-start">
										{loading && !taskRelatedIssueType?.length && (
											<Spinner dark={false} />
										)}
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
