/* eslint-disable no-mixed-spaces-and-tabs */
import { Button, InputField, Text } from 'lib/components';
import { StatusesListCard } from './list-card';

import { useForm } from 'react-hook-form';
import { useCallback, useEffect, useState } from 'react';
import { userState } from '@app/stores';
import { useRecoilState } from 'recoil';
import { PlusIcon } from '@heroicons/react/20/solid';
import { useTaskVersion } from '@app/hooks';
import { Spinner } from '@components/ui/loaders/spinner';
import { ITaskVersionItemList } from '@app/interfaces';

import { useTranslation } from 'lib/i18n';
import { clsxm } from '@app/utils';

type StatusForm = {
	formOnly?: boolean;
	onCreated?: () => void;
};

export const VersionForm = ({ formOnly = false, onCreated }: StatusForm) => {
	const { trans } = useTranslation('settingsTeam');

	const [user] = useRecoilState(userState);
	const { register, setValue, handleSubmit, reset } = useForm();
	const [createNew, setCreateNew] = useState(formOnly);
	const [edit, setEdit] = useState<ITaskVersionItemList | null>(null);

	const {
		loading,
		taskVersion,
		createTaskVersion,
		deleteTaskVersion,
		editTaskVersion,
		createTaskVersionLoading,
		editTaskVersionLoading,
	} = useTaskVersion();

	useEffect(() => {
		if (!edit) {
			setValue('name', '');
		}
	}, [taskVersion, edit, setValue]);

	useEffect(() => {
		if (edit) {
			setValue('name', edit.name);
		} else {
			setValue('name', '');
		}
	}, [
		edit,
		setValue,
		createTaskVersion,
		editTaskVersion,
		user?.employee?.organizationId,
		user?.tenantId,
	]);

	const onSubmit = useCallback(
		async (values: any) => {
			if (createNew) {
				createTaskVersion({
					name: values.name,
					color: '#FFFFFF',
					// description: '',
					organizationId: user?.employee?.organizationId,
					tenantId: user?.tenantId,
					// icon: values.icon,
					// projectId: '',
				})?.then(() => {
					!formOnly && setCreateNew(false);

					onCreated && onCreated();
					reset();
				});
			}
			if (edit && values.name !== edit.name) {
				editTaskVersion(edit.id, {
					name: values.name,
					// color: values.color,
					// icon: values.icon,
				})?.then(() => {
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
						{!formOnly && (
							<Text className="flex-none flex-grow-0 text-gray-400 text-lg font-normal mb-2 w-[200px]">
								{trans.VERSIONS}
							</Text>
						)}

						<div className="flex flex-col items-center sm:items-start">
							{!createNew && !edit && (
								<Button
									variant="outline"
									className="font-normal justify-start border-2 rounded-[10px] text-md w-[230px] gap-0 h-[46px]"
									onClick={() => {
										setEdit(null);
										setCreateNew(true);
									}}
								>
									<span className="mr-[11px]">
										<PlusIcon className=" font-normal w-[16px] h-[16px]" />
									</span>
									{trans.CREATE_NEW_VERSION}
								</Button>
							)}

							{(createNew || edit) && (
								<>
									<Text className="flex-none flex-grow-0 text-gray-400 text-lg font-normal mb-2">
										{createNew && 'New'}
										{edit && 'Edit'} Version
									</Text>
									<div
										className={clsxm(
											'flex w-full gap-x-5 items-center mt-3',
											formOnly && ['flex-wrap space-y-2']
										)}
									>
										<InputField
											type="text"
											placeholder={trans.CREATE_NEW_VERSION}
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
												createTaskVersionLoading || editTaskVersionLoading
											}
											loading={
												createTaskVersionLoading || editTaskVersionLoading
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

							{!formOnly && (
								<>
									<Text className="flex-none flex-grow-0 text-gray-400 text-lg font-normal mb-[1rem] w-full mt-[2.4rem] text-center sm:text-left">
										{trans.LIST_OF_VERSONS}
									</Text>
									<div className="flex flex-wrap w-full gap-3 justify-center sm:justify-start">
										{loading && !taskVersion?.length && (
											<Spinner dark={false} />
										)}
										{taskVersion && taskVersion?.length ? (
											taskVersion.map((version) => (
												<StatusesListCard
													key={version.id}
													statusTitle={
														version.name
															? version.name?.split('-').join(' ')
															: ''
													}
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
				</div>
			</form>
		</>
	);
};
