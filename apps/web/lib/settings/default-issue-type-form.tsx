/* eslint-disable no-mixed-spaces-and-tabs */
import { Text, Tooltip } from 'lib/components';

import { useTranslations } from 'next-intl';
import { useIssueType } from '@app/hooks';
import { IIssueTypesItemList, ITaskIssue } from '@app/interfaces';
import { clsxm } from '@app/utils';
import Image from 'next/image';
import { getTextColor } from '@app/helpers';
import { StatusesListCard } from './list-card';
import { TaskIssuesDropdown } from 'lib/features';

export const DefaultIssueTypeForm = () => {
	const t = useTranslations();
	const { issueTypes, editIssueType } = useIssueType();
	const defaultIssueType: IIssueTypesItemList | undefined = issueTypes.find((issue) => !issue.isDefault);
	const textColor = defaultIssueType?.color ? getTextColor(defaultIssueType.color) : '#cdd1d8';

	return (
		<>
			<form className="w-full" autoComplete="off">
				<div className="flex w-full">
					<div className="rounded-md m-h-64 p-[32px] pl-0 pr-0 flex gap-x-[2rem] w-full">
						<Text className="flex-none flex-grow-0 text-gray-400 text-lg font-normal mb-2 w-[200px]">
							{t('pages.settingsTeam.DEFAULT_ISSUE_TYPE')}
						</Text>

						<div className="flex flex-col w-full">
							{/* <>
								<Text className="flex-none flex-grow-0 w-full mb-2 text-lg font-normal text-gray-400">
									{t('common.NEW_ISSUE')}
								</Text>
								<div className="flex items-center w-full mt-3 gap-x-5">
									<InputField
										type="text"
										placeholder={t('common.CREATE_VERSION')}
										className="w-full mb-0"
										wrapperClassName="mb-0 w-full"
									/>
								</div>
								<div className="flex mt-5 gap-x-4">
									<Button
										variant="primary"
										className="px-4 py-4 font-normal rounded-xl text-md"
										type="submit"
									>
										{t('common.CREATE')}
									</Button>
									<Button variant="grey" className="px-4 py-4 font-normal rounded-xl text-md">
										{t('common.CANCEL')}
									</Button>
								</div>
							</> */}

							<div className="flex flex-wrap w-full gap-3">
								{defaultIssueType ? (
									<div className="border w-[21.4rem] flex items-center p-1 rounded-xl justify-between">
										<div
											className={clsxm(
												'rounded-xl',
												'w-2/3',
												'flex items-center p-3 gap-x-2 overflow-hidden mr-1'
											)}
											style={{
												backgroundColor:
													(defaultIssueType?.color as string) === ''
														? undefined
														: (defaultIssueType.color as string)
											}}
										>
											{defaultIssueType.icon && (
												<Image
													src={defaultIssueType.fullIconUrl as string}
													alt={defaultIssueType.name}
													width={20}
													height={20}
													decoding="async"
													data-nimg="1"
													loading="lazy"
													className="min-h-[20px]"
												/>
											)}
											<Tooltip
												label={defaultIssueType.name as string}
												// enabled={defaultIssueType.description.length >= CHARACTER_LIMIT_TO_SHOW}
												placement="auto"
												className={clsxm(
													'overflow-hidden text-ellipsis whitespace-nowrap w-full'
												)}
											>
												<Text.Label
													className={clsxm(
														'flex-none flex-grow-0 !w-40 max-w-[190px] font-normal',
														'capitalize overflow-hidden text-ellipsis whitespace-nowrap w-full',
														defaultIssueType.color === '' && ['dark:text-[#cdd1d8]'],
														defaultIssueType.icon && 'max-w-[135px]'
													)}
													style={{
														color: defaultIssueType.color === '' ? undefined : textColor
													}}
												>
													{defaultIssueType.name}
												</Text.Label>
											</Tooltip>
										</div>
										<div className="flex items-center gap-x-[12PX] mr-[4px]">
											<Tooltip label={t('common.EDIT')}>
												<TaskIssuesDropdown
													taskStatusClassName="!px-1 py-1 rounded-sm"
													showIssueLabels={true}
													onValueChange={(v) => console.log(v)}
													defaultValue={defaultIssueType.name as ITaskIssue}
													className="h-full"
												/>
												{/* <Button
													variant="ghost"
													className="p-0 m-0 min-w-0"
													onClick={() => {
														console.log('Edit');
													}}
												>
													<EditPenUnderlineIcon className="w-6 h-6 text-inherit" />
												</Button> */}
											</Tooltip>
											{/* <StatusDropdown
											// sidebarUI={props.sidebarUI}
											className={clsxm('w-4')}
											// items={props.forParentChildRelationship ? updatedItemsBasedOnTaskIssueType : items}
											// value={item || (taskIssues['Task'] as Required<TStatusItem>)}
											defaultItem={undefined}
											onChange={() => {
												console.log('On change');
											}}
											issueType="issue"
											items={issueTypes}
											value={issueTypes[0]}
										/> */}
										</div>
									</div>
								) : (
									<StatusesListCard
										statusTitle={'No Default Issue Type'}
										bgColor={''}
										statusIcon={''}
										showDeleteButton={false}
										onEdit={() => {
											// await editIssueType(defaultIssueType.id);
										}}
										onDelete={() => {
											console.log('click delete');
										}}
									/>
								)}
							</div>
						</div>
					</div>
				</div>
			</form>
		</>
	);
};
