/* eslint-disable no-mixed-spaces-and-tabs */
import { withAuthentication } from 'lib/app/authenticator';
import { Button, InputField, Text } from 'lib/components';
import { useForm } from 'react-hook-form';
import { useCallback, useEffect, useState } from 'react';
import { userState } from '@app/stores';
import { useRecoilState } from 'recoil';
import ListCard from './list-card';
import { LanguageDropDown } from './language-dropdown';
import { PlusIcon } from '@heroicons/react/20/solid';
import { Spinner } from '@components/ui/loaders/spinner';
import { useTaskSizes } from '@app/hooks/features/useTaskSizes';
import { ITaskSizesItemList } from '@app/interfaces';

const TaskSizesForm = () => {
	const [user] = useRecoilState(userState);
	const { register, setValue, handleSubmit } = useForm();
	const [createNew, setCreateNew] = useState(false);
	const [edit, setEdit] = useState<ITaskSizesItemList | null>(null);

	const {
		loading,
		taskSizes,
		createTaskSizes,
		deleteTaskSizes,
		editTaskSizes,
	} = useTaskSizes();

	useEffect(() => {
		if (!edit) {
			setValue('name', '');
		}
	}, [taskSizes, edit, setValue]);

	useEffect(() => {
		if (edit) {
			setValue('name', edit.name);
		} else {
			setValue('name', '');
		}
	}, [edit, setValue]);

	const onSubmit = useCallback(
		async (values: any) => {
			// TODO: Color, icon
			if (createNew) {
				createTaskSizes({
					name: values.name,
					color: '#f5b8b8',
					// description: '',
					organizationId: user?.employee.organizationId,
					tenantId: user?.tenantId,
					// icon: '',
					// projectId: '',
				})?.then(() => {
					setCreateNew(false);
				});
			}
			if (edit && values.name !== edit.name) {
				console.log(edit);
				editTaskSizes(edit.id, {
					...edit,
					...values,
					value: values.name,
				})?.then(() => {
					setEdit(null);
				});
			}
		},
		[
			taskSizes,
			edit,
			createNew,
			createTaskSizes,
			editTaskSizes,
			user?.employee.organizationId,
			user?.tenantId,
			setCreateNew,
			setEdit,
		]
	);

	return (
		<>
			<form
				className="w-full"
				onSubmit={handleSubmit(onSubmit)}
				autoComplete="off"
			>
				<div className="flex">
					<div className="rounded-md m-h-64 p-[32px] flex gap-x-[2rem]">
						<Text className="flex-none flex-grow-0 text-md text-gray-400 font-medium mb-2 w-[20%]">
							Task Sizes
						</Text>

						<div className="flex flex-col">
							{!createNew && !edit && (
								<Button
									variant="outline"
									className="font-normal justify-start border-2 rounded-[10px] text-md w-[230px] h-[46px] gap-0"
									onClick={() => {
										setEdit(null);
										setCreateNew(true);
									}}
								>
									<span className="mr-[11px]">
										<PlusIcon className=" font-normal w-[16px] h-[16px]" />
									</span>
									Create new Sizes
								</Button>
							)}

							{(createNew || edit) && (
								<>
									<Text className="flex-none flex-grow-0 text-md text-gray-400 font-medium mb-2">
										{createNew && 'New'}
										{edit && 'Edit'} Sizes
									</Text>
									<div className="flex  w-full gap-x-5 items-center mt-3">
										<InputField
											type="text"
											placeholder="Create Size"
											className="mb-0"
											wrapperClassName="mb-0"
											{...register('name')}
										/>

										<LanguageDropDown />

										<LanguageDropDown />
									</div>
									<div className="flex gap-x-4 mt-5">
										<Button
											variant="primary"
											className="font-normal py-4 px-4 rounded-xl text-md"
											type="submit"
										>
											{edit ? 'Save' : 'Create'}
										</Button>
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
									</div>
								</>
							)}

							<Text className="flex-none flex-grow-0 text-md text-gray-400 font-medium mb-[1rem] w-full mt-[2.4rem]">
								List of Sizes
							</Text>
							<div className="flex flex-wrap w-full gap-3">
								{loading && !taskSizes && <Spinner dark={false} />}
								{taskSizes &&
									taskSizes?.length &&
									taskSizes.map((size, index) => (
										<ListCard
											statusTitle={
												size?.name ? size?.name?.split('-').join(' ') : ''
											}
											bgColor={size?.color || ''}
											statusIcon={size?.icon || ''}
											onEdit={() => {
												setCreateNew(false);
												setEdit(size);
											}}
											onDelete={() => {
												deleteTaskSizes(size.id);
											}}
											key={index}
										/>
									))}
							</div>
						</div>
					</div>
				</div>
			</form>
		</>
	);
};
export default withAuthentication(TaskSizesForm, {
	displayName: 'TaskSizesForm',
});
