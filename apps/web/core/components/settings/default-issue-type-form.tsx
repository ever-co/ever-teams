/* eslint-disable no-mixed-spaces-and-tabs */
import { SpinnerLoader, Text, Tooltip } from '@/core/components';

import { useTranslations } from 'next-intl';
import { useIssueType } from '@/core/hooks';
import { IIssueTypesItemList } from '@/core/types/interfaces';
import { getTextColor } from '@/core/lib/helpers/index';
import { StatusesListCard } from './list-card';
import { EditPenUnderlineIcon } from 'assets/svg';
import { clsxm } from '@/core/lib/utils';
import Image from 'next/image';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/core/components/ui/dropdown-menu';

export const DefaultIssueTypeForm = () => {
	const t = useTranslations();
	const { issueTypes, editIssueType, editIssueTypeLoading } = useIssueType();
	const defaultIssueType: IIssueTypesItemList | undefined = issueTypes.find((issue) => issue.isDefault);
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
										<div className="flex h-10 items-center gap-x-[12PX] mr-[4px]">
											{editIssueTypeLoading ? (
												<SpinnerLoader size={25} />
											) : (
												<Tooltip label={t('common.EDIT')}>
													<DropdownMenu>
														<DropdownMenuTrigger className={'rounded-lg'}>
															<EditPenUnderlineIcon className="w-6 h-6 text-inherit" />
														</DropdownMenuTrigger>
														<DropdownMenuContent className="dark:bg-[#1E2025] bg-white w-10/12 flex flex-col gap-3 p-4 rounded-2xl dark:border-gray-500 border-gray-200 border-[1px] shadow-2xl shadow-black/20">
															{issueTypes.map((issue, index) => {
																return (
																	!issue.isDefault && (
																		<DropdownMenuItem
																			onClick={async () => {
																				await editIssueType(issue.id, {
																					...issue,
																					isDefault: true
																				});
																				issueTypes.forEach(async (is) => {
																					issue.id != is.id &&
																						(await editIssueType(is.id, {
																							...is,
																							isDefault: false
																						}));
																				});
																			}}
																			className={clsxm(
																				'flex gap-2 rounded-lg cursor-pointer p-2 text-black/70 hover:text-black/70'
																			)}
																			style={{ background: issue.color }}
																			key={index}
																		>
																			<Image
																				src={issue.fullIconUrl as string}
																				alt={issue.name}
																				width={10}
																				height={10}
																				decoding="async"
																				data-nimg="1"
																				loading="lazy"
																				className="min-h-[20px]"
																			/>
																			<div>{issue.name}</div>
																		</DropdownMenuItem>
																	)
																);
															})}
														</DropdownMenuContent>
													</DropdownMenu>
												</Tooltip>
											)}
										</div>
									</div>
								) : (
									<StatusesListCard
										statusTitle={t('pages.settingsTeam.NO_DEFAULT_ISSUE_TYPE')}
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
