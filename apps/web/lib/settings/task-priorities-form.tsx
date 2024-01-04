/* eslint-disable no-mixed-spaces-and-tabs */
import { userState } from '@app/stores';
import { Button, ColorPicker, InputField, Text } from 'lib/components';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRecoilValue } from 'recoil';
import { StatusesListCard } from './list-card';

import { useRefetchData, useTaskPriorities } from '@app/hooks';
import { IIcon, ITaskPrioritiesItemList } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Spinner } from '@components/ui/loaders/spinner';
import { PlusIcon } from '@heroicons/react/20/solid';
import { useTranslations } from 'next-intl';
import { generateIconList } from './icon-items';
import IconPopover from './icon-popover';

type StatusForm = {
	formOnly?: boolean;
	onCreated?: () => void;
};

export const TaskPrioritiesForm = ({ formOnly = false, onCreated }: StatusForm) => {
	const user = useRecoilValue(userState);
	const { register, setValue, handleSubmit, reset, getValues } = useForm();
	const [createNew, setCreateNew] = useState(formOnly);
	const [edit, setEdit] = useState<ITaskPrioritiesItemList | null>(null);
	const t = useTranslations();

	const taskStatusIconList: IIcon[] = generateIconList('task-statuses', [
		'open',
		'in-progress',
		'ready',
		'in-review',
		'blocked',
		'completed'
	]);
	const taskSizesIconList: IIcon[] = generateIconList('task-sizes', [
		'x-large'
		// 'large',
		// 'medium',
		// 'small',
		// 'tiny',
	]);
	const taskPrioritiesIconList: IIcon[] = generateIconList('task-priorities', ['urgent', 'high', 'medium', 'low']);

	const iconList: IIcon[] = [...taskStatusIconList, ...taskSizesIconList, ...taskPrioritiesIconList];

	const {
		loading,
		taskPriorities,
		deleteTaskPriorities,
		createTaskPriorities,
		editTaskPriorities,
		createTaskPrioritiesLoading,
		editTaskPrioritiesLoading
	} = useTaskPriorities();
	const { refetch } = useRefetchData();

	useEffect(() => {
		if (!edit && !getValues().name) {
			setValue('name', '');
			setValue('color', '');
			setValue('icon', '');
		}
	}, [edit, setValue, getValues]);

	useEffect(() => {
		if (edit) {
			setValue('name', edit.name?.split('-').join(' '));
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
				createTaskPriorities({
					name: values.name,
					color: values.color,
					// description: '',
					organizationId: user?.employee?.organizationId,
					tenantId: user?.tenantId,
					icon: values.icon
					// projectId: '',
				})?.then(() => {
					!formOnly && setCreateNew(false);

					onCreated && onCreated();
					refetch();
					reset();
				});
			}
			if (
				edit &&
				(values.name !== edit.name?.split('-').join(' ') ||
					values.color !== edit.color ||
					values.icon !== edit.icon)
			) {
				editTaskPriorities(edit.id, {
					name: values.name,
					color: values.color,
					icon: values.icon
				})?.then(() => {
					setEdit(null);
					refetch();
				});
			}
		},
		[edit, createNew, formOnly, editTaskPriorities, onCreated, user, reset, createTaskPriorities, refetch]
	);

	return (
		<>
			<form className="w-full" onSubmit={handleSubmit(onSubmit)} autoComplete="off">
				<div className="flex">
					<div className="rounded-md m-h-64 p-[32px] pl-0 pr-0 flex gap-x-[2rem] flex-col sm:flex-row items-center sm:items-start">
						{!formOnly && (
							<Text className="flex-none flex-grow-0 text-gray-400 text-lg font-normal mb-2 w-[200px] text-center sm:text-left">
								{t('pages.settingsTeam.TASK_PRIORITIES')}
							</Text>
						)}

						<div className="flex flex-col items-center sm:items-start">
							{!createNew && !edit && (
								<Button
									variant="outline"
									className="font-normal justify-center border-2 rounded-[10px] text-md w-[230px] h-[46px] gap-2"
									onClick={() => {
										setEdit(null);
										setCreateNew(true);
									}}
								>
									<PlusIcon className=" font-normal w-[16px] h-[16px]" />
									{t('pages.settingsTeam.CREATE_NEW_PRIORITY')}
								</Button>
							)}

							{(createNew || edit) && (
								<>
									<Text className="flex-none flex-grow-0 mb-2 text-lg font-normal text-gray-400">
										{createNew && t('common.NEW')}
										{edit && t('common.EDIT')} {t('pages.settingsTeam.PRIORITIES_HEADING')}
									</Text>
									<div
										className={clsxm(
											'flex w-full gap-x-5 items-center mt-3',
											formOnly && ['flex-wrap space-y-2']
										)}
									>
										<InputField
											type="text"
											placeholder={t('pages.settingsTeam.CREATE_NEW_PRIORITY')}
											className="mb-0 min-w-[350px]"
											wrapperClassName="mb-0 rounded-lg"
											{...register('name')}
										/>

										<IconPopover
											iconList={iconList}
											setValue={setValue}
											active={
												edit
													? (iconList.find((icon) => icon.path === edit.icon) as IIcon)
													: null
											}
										/>

										<ColorPicker
											defaultColor={edit ? edit.color : undefined}
											onChange={(color) => setValue('color', color)}
										/>
									</div>
									<div className="flex mt-5 gap-x-4">
										<Button
											variant="primary"
											className="px-4 py-4 font-normal rounded-xl text-md"
											type="submit"
											disabled={createTaskPrioritiesLoading || editTaskPrioritiesLoading}
											loading={createTaskPrioritiesLoading || editTaskPrioritiesLoading}
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

							{!formOnly && taskPriorities?.length > 0 && (
								<>
									<Text className="flex-none flex-grow-0 text-gray-400 text-lg font-normal mb-[1rem] w-full mt-[2.4rem] text-center sm:text-left">
										{t('pages.settingsTeam.LIST_OF_PRIORITIES')}
									</Text>
									<div className="flex flex-wrap justify-center w-full gap-3 sm:justify-start">
										{loading && !taskPriorities?.length && <Spinner dark={false} />}
										{taskPriorities && taskPriorities?.length ? (
											taskPriorities.map((priority) => (
												<StatusesListCard
													statusTitle={
														priority.name ? priority.name?.split('-').join(' ') : ''
													}
													bgColor={priority.color || ''}
													statusIcon={priority.fullIconUrl || ''}
													onEdit={() => {
														setCreateNew(false);
														setEdit(priority);
													}}
													onDelete={() => {
														deleteTaskPriorities(priority.id);
													}}
													key={priority.id}
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
