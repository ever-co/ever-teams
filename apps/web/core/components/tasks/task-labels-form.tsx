/* eslint-disable no-mixed-spaces-and-tabs */
import { useTaskLabels } from '@/core/hooks';
import { taskLabelsListState } from '@/core/stores';
import { clsxm } from '@/core/lib/utils';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { Spinner } from '@/core/components/common/spinner';
import { PlusIcon } from '@heroicons/react/20/solid';
import { Button, ColorPicker, Text } from '@/core/components';
import { useCallback, useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { generateIconList, IIcon } from '../settings/icon-items';
import IconPopover from '../settings/icon-popover';
import { StatusesListCard } from '../settings/list-card';
import { InputField } from '../duplicated-components/_input';
import { ITag } from '@/core/types/interfaces/tag/tag';

type StatusForm = {
	formOnly?: boolean;
	onCreated?: () => void;
};

export const TaskLabelForm = ({ formOnly = false, onCreated }: StatusForm) => {
	const { data: user } = useUserQuery();
	const { register, setValue, handleSubmit, reset, watch } = useForm();
	const [edit, setEdit] = useState<ITag | null>(null);
	const [isCreating, setIsCreating] = useState(formOnly);
	const t = useTranslations();
	const initialRender = useRef(true);
	const taskLabels = useAtomValue(taskLabelsListState);

	const formValues = watch();

	const taskStatusIconList: IIcon[] = generateIconList('task-statuses', [
		'open',
		'in-progress',
		'ready',
		'in-review',
		'blocked',
		'completed'
	]);
	const taskSizesIconList: IIcon[] = generateIconList('task-sizes', ['x-large']);
	const taskPrioritiesIconList: IIcon[] = generateIconList('task-priorities', ['urgent', 'high', 'medium', 'low']);
	const iconList: IIcon[] = [...taskStatusIconList, ...taskSizesIconList, ...taskPrioritiesIconList];

	const {
		loading,
		deleteTaskLabels,
		createTaskLabels,
		editTaskLabels,
		createTaskLabelsLoading,
		editTaskLabelsLoading
	} = useTaskLabels();

	useEffect(() => {
		if (initialRender.current) {
			initialRender.current = false;
			reset({
				name: '',
				color: '',
				icon: ''
			});
		}
	}, [reset]);

	useEffect(() => {
		if (edit) {
			reset({
				name: edit.name?.split('-').join(' ') || '',
				color: edit.color || '',
				icon: edit.icon || ''
			});
		}
	}, [edit, reset]);

	const onSubmit = useCallback(
		async (values: any) => {
			if (isCreating) {
				await createTaskLabels({
					name: values.name,
					color: values.color,
					organizationId: user?.employee?.organizationId,
					tenantId: user?.tenantId,
					icon: values.icon
				});
				if (!formOnly) setIsCreating(false);
				onCreated?.();
				reset();
			} else if (edit) {
				await editTaskLabels(edit.id, {
					name: values.name,
					color: values.color,
					icon: values.icon
				});
				setEdit(null);
			}
		},
		[isCreating, edit, formOnly, onCreated, reset, createTaskLabels, editTaskLabels, user]
	);

	return (
		<form className="z-50 w-full" onSubmit={handleSubmit(onSubmit)} autoComplete="off">
			<div className="flex justify-center sm:justify-start">
				<div className="rounded-md m-h-64 p-[32px] pl-0 pr-0 flex gap-x-[2rem] flex-col sm:flex-row items-center sm:items-start">
					{!formOnly && (
						<Text className="flex-none flex-grow-0 text-gray-400 text-lg font-normal mb-2 w-[200px] text-center sm:text-left">
							{t('pages.settingsTeam.TASK_LABELS')}
						</Text>
					)}

					<div className="flex flex-col items-center sm:items-start">
						{!isCreating && !edit && (
							<Button
								variant="outline"
								className="font-normal justify-center border-2 rounded-[10px] text-md w-[230px] h-[46px] gap-2"
								onClick={() => {
									setEdit(null);
									setIsCreating(true);
								}}
							>
								<PlusIcon className="font-normal w-[16px] h-[16px]" />
								{t('pages.settingsTeam.CREATE_NEW_LABEL')}
							</Button>
						)}

						{(isCreating || edit) && (
							<>
								<Text className="flex-none flex-grow-0 mb-2 text-lg font-normal text-gray-400">
									{isCreating && t('common.NEW')}
									{edit && t('common.EDIT')} {t('common.LABEL')}
								</Text>
								<div
									className={clsxm(
										'flex w-full gap-x-5 items-center mt-3',
										formOnly && ['flex-wrap space-y-2']
									)}
								>
									<InputField
										type="text"
										placeholder={t('pages.settingsTeam.CREATE_NEW_LABEL')}
										className="mb-0 min-w-[350px]"
										wrapperClassName="mb-0 rounded-lg"
										{...register('name')}
									/>

									<IconPopover
										iconList={iconList}
										setValue={setValue}
										active={
											edit ? (iconList.find((icon) => icon.path === edit.icon) as IIcon) : null
										}
									/>

									<ColorPicker
										defaultColor={edit ? edit.color : formValues.color}
										onChange={(color) => setValue('color', color)}
									/>
								</div>
								<div className="flex gap-x-4 mt-5">
									<Button
										variant="primary"
										className="px-4 py-4 font-normal rounded-xl text-md"
										type="submit"
										disabled={createTaskLabelsLoading || editTaskLabelsLoading}
										loading={createTaskLabelsLoading || editTaskLabelsLoading}
									>
										{edit ? t('common.SAVE') : t('common.CREATE')}
									</Button>

									{!formOnly && (
										<Button
											variant="grey"
											className="px-4 py-4 font-normal rounded-xl text-md"
											onClick={() => {
												setIsCreating(false);
												setEdit(null);
											}}
										>
											{t('common.CANCEL')}
										</Button>
									)}
								</div>
							</>
						)}

						{!formOnly && taskLabels?.length > 0 && (
							<>
								<Text className="flex-none flex-grow-0 text-gray-400 text-lg font-normal mb-[1rem] w-full mt-[2.4rem] text-center sm:text-left">
									{t('pages.settingsTeam.LIST_OF_LABELS')}
								</Text>
								<div className="flex flex-wrap gap-3 justify-center w-full sm:justify-start">
									{loading && !taskLabels?.length && <Spinner dark={false} />}
									{taskLabels?.map((label: any) => (
										<StatusesListCard
											key={label.id}
											statusTitle={label.name?.split('-').join(' ') || ''}
											bgColor={label.color || ''}
											statusIcon={label.fullIconUrl || ''}
											onEdit={() => setEdit(label)}
											onDelete={() => deleteTaskLabels(label.id)}
										/>
									))}
								</div>
							</>
						)}
					</div>
				</div>
			</div>
		</form>
	);
};
