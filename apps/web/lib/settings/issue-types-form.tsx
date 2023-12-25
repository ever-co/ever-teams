/* eslint-disable no-mixed-spaces-and-tabs */
import { useIssueType } from '@app/hooks';
import { IIcon, IIssueTypesItemList } from '@app/interfaces';
import { userState } from '@app/stores';
import { Spinner } from '@components/ui/loaders/spinner';
import { PlusIcon } from '@heroicons/react/20/solid';
import { Button, ColorPicker, InputField, Text } from 'lib/components';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { useRecoilState } from 'recoil';
import { generateIconList } from './icon-items';
import IconPopover from './icon-popover';
import { StatusesListCard } from './list-card';

export const IssueTypesForm = () => {
	const t = useTranslations();
	const [user] = useRecoilState(userState);
	const { register, setValue, handleSubmit, reset } = useForm();
	const [createNew, setCreateNew] = useState(false);
	const [edit, setEdit] = useState<IIssueTypesItemList | null>(null);

	const taskStatusIconList: IIcon[] = generateIconList('task-statuses', [
		'open',
		'in-progress',
		'ready',
		'in-review',
		'blocked',
		'completed'
	]);
	const taskSizesIconList: IIcon[] = generateIconList('task-sizes', ['x-large', 'large', 'medium', 'small', 'tiny']);
	const taskPrioritiesIconList: IIcon[] = generateIconList('task-priorities', ['urgent', 'high', 'medium', 'low']);

	const iconList: IIcon[] = [...taskStatusIconList, ...taskSizesIconList, ...taskPrioritiesIconList];

	const {
		loading,
		issueTypes,
		createIssueType,
		deleteIssueType,
		editIssueType,
		createIssueTypeLoading,
		editIssueTypeLoading
	} = useIssueType();

	useEffect(() => {
		if (!edit) {
			setValue('name', '');
			setValue('color', '');
			setValue('icon', '');
		}
	}, [issueTypes, edit, setValue]);

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
	}, [edit, setValue, createIssueType, editIssueType, user?.employee?.organizationId, user?.tenantId]);

	const onSubmit = useCallback(
		async (values: any) => {
			if (createNew) {
				createIssueType({
					name: values.name,
					color: values.color,
					// description: '',
					organizationId: user?.employee?.organizationId,
					tenantId: user?.tenantId,
					icon: values.icon
					// projectId: '',
				})?.then(() => {
					setCreateNew(false);
					reset();
				});
			}
			if (edit && (values.name !== edit.name || values.color !== edit.color || values.icon !== edit.icon)) {
				editIssueType(edit.id, {
					name: values.name,
					color: values.color,
					icon: values.icon
				})?.then(() => {
					setEdit(null);
				});
			}
		},
		[edit, createNew, editIssueType, user, reset, createIssueType]
	);

	return (
		<>
			<form className="w-full" onSubmit={handleSubmit(onSubmit)} autoComplete="off">
				<div className="flex">
					<div className="rounded-md m-h-64 p-[32px] flex gap-x-[2rem] flex-col sm:flex-row items-center sm:items-start">
						<Text className="flex-none flex-grow-0 text-md text-gray-400 font-medium mb-2 w-[200px] text-center sm:text-left">
							{t('pages.settingsTeam.ISSUE_TYPES')}
						</Text>

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
									{t('pages.settingsTeam.CREATE_NEW_ISSUE_TYPES')}
								</Button>
							)}

							{(createNew || edit) && (
								<>
									<Text className="flex-none flex-grow-0 mb-2 font-normal text-gray-400 text-md">
										{createNew && t('common.NEW')}
										{edit && t('common.EDIT')} {t('common.ISSUE_TYPE')}
									</Text>
									<div className="flex items-center w-full mt-3 gap-x-5">
										<InputField
											type="text"
											placeholder={t('pages.settingsTeam.CREATE_NEW_ISSUE_TYPES')}
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
											disabled={createIssueTypeLoading || editIssueTypeLoading}
											loading={createIssueTypeLoading || editIssueTypeLoading}
										>
											{edit ? t('common.SAVE') : t('common.CREATE')}
										</Button>
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
									</div>
								</>
							)}

							<Text className="flex-none flex-grow-0 text-md text-gray-400 font-medium mb-[1rem] w-full mt-[2.4rem] text-center sm:text-left">
								{t('pages.settingsTeam.LIST_OF_STATUSES')}
							</Text>
							<div className="flex flex-wrap justify-center w-full gap-3 sm:justify-start">
								{loading && !issueTypes?.length && <Spinner dark={false} />}
								{issueTypes && issueTypes?.length ? (
									issueTypes.map((type) => (
										<StatusesListCard
											key={type.id}
											statusTitle={type?.name ? type?.name?.split('-').join(' ') : ''}
											bgColor={type?.color || ''}
											statusIcon={type?.fullIconUrl || ''}
											onEdit={() => {
												setCreateNew(false);
												setEdit(type);
											}}
											onDelete={() => {
												deleteIssueType(type.id);
											}}
											isStatus={true}
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
