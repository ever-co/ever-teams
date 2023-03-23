/* eslint-disable no-mixed-spaces-and-tabs */
import { Button, InputField, Text } from 'lib/components';
import { useForm } from 'react-hook-form';
import { useCallback, useEffect, useState } from 'react';
import { userState } from '@app/stores';
import { useRecoilValue } from 'recoil';
import { StatusesListCard } from './list-card';
import { PlusIcon } from '@heroicons/react/20/solid';
import { Spinner } from '@components/ui/loaders/spinner';
import { useTaskSizes } from '@app/hooks/features/useTaskSizes';
import { IColor, IIcon, ITaskSizesItemList } from '@app/interfaces';
import { useTranslation } from 'lib/i18n';
import { ColorDropdown } from './color-dropdown';
import { generateIconList } from './icon-items';
import IconPopover from './icon-popover';

export const TaskSizesForm = () => {
	const user = useRecoilValue(userState);
	const { register, setValue, handleSubmit } = useForm();
	const [createNew, setCreateNew] = useState(false);
	const [edit, setEdit] = useState<ITaskSizesItemList | null>(null);

	const { trans } = useTranslation('settingsTeam');

	const taskStatusIconList: IIcon[] = generateIconList('task-statuses', [
		'open',
		'in-progress',
		'ready',
		'in-review',
		'blocked',
		'completed',
	]);
	const taskSizesIconList: IIcon[] = generateIconList('task-sizes', [
		'x-large',
		'large',
		'medium',
		'small',
		'tiny',
	]);
	const taskPrioritiesIconList: IIcon[] = generateIconList('task-priorities', [
		'urgent',
		'high',
		'medium',
		'low',
	]);

	const iconList: IIcon[] = [
		...taskStatusIconList,
		...taskSizesIconList,
		...taskPrioritiesIconList,
	];

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
			setValue('color', '');
			setValue('icon', '');
		}
	}, [taskSizes, edit, setValue]);

	useEffect(() => {
		if (edit) {
			setValue('name', edit.name);
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
				createTaskSizes({
					name: values.name,
					color: values.color,
					// description: '',
					organizationId: user?.employee.organizationId,
					tenantId: user?.tenantId,
					icon: values.icon,
					// projectId: '',
				})?.then(() => {
					setCreateNew(false);
				});
			}
			if (
				edit &&
				(values.name !== edit.name ||
					values.color !== edit.color ||
					values.icon !== edit.icon)
			) {
				editTaskSizes(edit.id, {
					name: values.name,
					color: values.color,
					icon: values.icon,
				})?.then(() => {
					setEdit(null);
				});
			}
		},
		[edit, createNew, editTaskSizes, user, createTaskSizes]
	);

	return (
		<>
			<form
				className="w-full"
				onSubmit={handleSubmit(onSubmit)}
				autoComplete="off"
			>
				<div className="flex">
					<div className="rounded-md m-h-64 p-[32px] flex gap-x-[2rem] flex-col sm:flex-row items-center sm:items-start">
						<Text className="flex-none flex-grow-0 text-md text-gray-400 font-medium mb-2 w-[200px] text-center sm:text-left">
							{trans.TASK_SIZES}
						</Text>

						<div className="flex flex-col items-center sm:items-start">
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
									{trans.CREATE_NEW_SIZES}
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
											className="mb-0 min-w-[350px]"
											wrapperClassName="mb-0"
											{...register('name')}
										/>

										<IconPopover
											iconList={iconList}
											setValue={setValue}
											active={
												edit
													? (iconList.find(
															(icon) => icon.path === edit.icon
													  ) as IIcon)
													: null
											}
										/>

										<ColorDropdown
											setValue={setValue}
											active={
												edit
													? ({ title: edit.color, color: edit.color } as IColor)
													: null
											}
										/>
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

							<Text className="flex-none flex-grow-0 text-md text-gray-400 font-medium mb-[1rem] w-full mt-[2.4rem] text-center sm:text-left">
								{trans.LIST_OF_SIZES}
							</Text>
							<div className="flex flex-wrap w-full gap-3 justify-center sm:justify-start">
								{loading && !taskSizes && <Spinner dark={false} />}
								{taskSizes && taskSizes?.length ? (
									taskSizes.map((size) => (
										<StatusesListCard
											key={size.id}
											statusTitle={
												size?.name ? size?.name?.split('-').join(' ') : ''
											}
											bgColor={size?.color || ''}
											statusIcon={size?.fullIconUrl || ''}
											onEdit={() => {
												setCreateNew(false);
												setEdit(size);
											}}
											onDelete={() => {
												deleteTaskSizes(size.id);
											}}
										/>
									))
								) : (
									<></>
								)}
							</div>
						</div>
					</div>
				</div>
			</form>
		</>
	);
};
