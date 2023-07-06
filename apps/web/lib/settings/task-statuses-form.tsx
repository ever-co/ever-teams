/* eslint-disable no-mixed-spaces-and-tabs */
import { Button, ColorPicker, InputField, Text } from 'lib/components';
import { useForm } from 'react-hook-form';
import { useCallback, useEffect, useState } from 'react';
import { userState } from '@app/stores';
import { useRecoilState } from 'recoil';
import { StatusesListCard } from './list-card';
import { PlusIcon } from '@heroicons/react/20/solid';
import { useTaskStatus } from '@app/hooks';
import { Spinner } from '@components/ui/loaders/spinner';
import { IIcon, ITaskStatusItemList } from '@app/interfaces';
import { useTranslation } from 'lib/i18n';
import { generateIconList } from './icon-items';
import IconPopover from './icon-popover';
import { clsxm } from '@app/utils';

export const TaskStatusesForm = ({ formOnly = false } = {}) => {
	const [user] = useRecoilState(userState);
	const { register, setValue, handleSubmit, reset } = useForm();
	const [createNew, setCreateNew] = useState(formOnly);
	const [edit, setEdit] = useState<ITaskStatusItemList | null>(null);
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
		taskStatus,
		createTaskStatus,
		deleteTaskStatus,
		editTaskStatus,
		createTaskStatusLoading,
		editTaskStatusLoading,
	} = useTaskStatus();

	useEffect(() => {
		if (!edit) {
			setValue('name', '');
			setValue('color', '');
			setValue('icon', '');
		}
	}, [taskStatus, edit, setValue]);

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
	}, [
		edit,
		setValue,
		createTaskStatus,
		editTaskStatus,
		user?.employee?.organizationId,
		user?.tenantId,
	]);

	const onSubmit = useCallback(
		async (values: any) => {
			if (createNew) {
				createTaskStatus({
					name: values.name,
					color: values.color,
					// description: '',
					organizationId: user?.employee?.organizationId,
					tenantId: user?.tenantId,
					icon: values.icon,
					// projectId: '',
				})?.then(() => {
					!formOnly && setCreateNew(false);
					reset();
				});
			}
			if (
				edit &&
				(values.name !== edit.name ||
					values.color !== edit.color ||
					values.icon !== edit.icon)
			) {
				editTaskStatus(edit.id, {
					name: values.name,
					color: values.color,
					icon: values.icon,
				})?.then(() => {
					setEdit(null);
				});
			}
		},
		[edit, createNew, formOnly, editTaskStatus, user, reset, createTaskStatus]
	);

	return (
		<>
			<form
				className="w-full"
				onSubmit={handleSubmit(onSubmit)}
				autoComplete="off"
			>
				<div className="flex">
					<div className="rounded-md m-h-64 p-[32px] pl-0 pr-0 flex gap-x-[2rem] flex-col sm:flex-row items-center sm:items-start">
						{!formOnly && (
							<Text className="flex-none flex-grow-0 text-gray-400 text-lg font-normal mb-2 w-[200px] text-center sm:text-left">
								{trans.TASK_STATUSES}
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
									{trans.CREATE_NEW_STATUSES}
								</Button>
							)}

							{(createNew || edit) && (
								<>
									<Text className="flex-none flex-grow-0 text-gray-400 text-lg font-normal mb-2">
										{createNew && 'New'}
										{edit && 'Edit'} Statuses
									</Text>
									<div
										className={clsxm(
											'flex w-full gap-x-5 items-center mt-3',
											formOnly && ['flex-wrap space-y-2']
										)}
									>
										<InputField
											type="text"
											placeholder="Create Status"
											className="mb-0 min-w-[350px]"
											wrapperClassName="mb-0 rounded-lg"
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

										<ColorPicker
											defaultColor={edit ? edit.color : undefined}
											onChange={(color) => setValue('color', color)}
										/>
									</div>
									<div className="flex gap-x-4 mt-5">
										<Button
											variant="primary"
											className="font-normal py-4 px-4 rounded-xl text-md"
											type="submit"
											disabled={
												createTaskStatusLoading || editTaskStatusLoading
											}
											loading={createTaskStatusLoading || editTaskStatusLoading}
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
										{trans.LIST_OF_STATUSES}
									</Text>
									<div className="flex flex-wrap w-full gap-3 justify-center sm:justify-start">
										{loading && !taskStatus?.length && <Spinner dark={false} />}
										{taskStatus && taskStatus?.length ? (
											taskStatus.map((status) => (
												<StatusesListCard
													key={status.id}
													statusTitle={
														status.name ? status.name?.split('-').join(' ') : ''
													}
													bgColor={status.color || ''}
													statusIcon={status.fullIconUrl || ''}
													onEdit={() => {
														setCreateNew(false);
														setEdit(status);
													}}
													onDelete={() => {
														deleteTaskStatus(status.id);
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
