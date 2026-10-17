/* eslint-disable no-mixed-spaces-and-tabs */
import { SpinnerLoader, Text } from '@/core/components';

import { useTranslations } from 'next-intl';
import { useIssueTypesQuery } from '@/core/hooks/tasks/use-issue-types-query';
import { useEditIssueType } from '@/core/hooks/tasks/use-edit-issue-type';
import { StatusesListCard } from '../settings/list-card';
import { EditPenUnderlineIcon } from 'assets/svg';
import { clsxm } from '@/core/lib/utils';
import Image from 'next/image';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { Tooltip } from '../duplicated-components/tooltip';
import { IIssueType } from '@/core/types/interfaces/task/issue-type';

// Settings row: label column on the left, content on the right (see the settings design contract).
const ROW = 'grid grid-cols-1 gap-2 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4';
const LABEL = 'text-sm font-medium text-muted-foreground sm:pt-2';

export const DefaultIssueTypeForm = () => {
	const t = useTranslations();

	const { issueTypes } = useIssueTypesQuery();
	const { editIssueType, editIssueTypeLoading } = useEditIssueType();
	const defaultIssueType: IIssueType | undefined = issueTypes.find((issue) => issue.isDefault);

	return (
		<>
			<form className="w-full" autoComplete="off">
				<div className={ROW}>
					<Text className={LABEL}>{t('pages.settingsTeam.DEFAULT_ISSUE_TYPE')}</Text>

					<div className="flex min-w-0 flex-col">
						<div className="flex w-full flex-wrap gap-2">
							{defaultIssueType ? (
								<div className="inline-flex h-9 max-w-full items-center gap-2 rounded-md border border-border bg-card pl-2.5 pr-1 text-sm text-foreground">
									{defaultIssueType.color ? (
										<span
											aria-hidden="true"
											className="size-2.5 shrink-0 rounded-full ring-1 ring-inset ring-foreground/10"
											style={{ backgroundColor: defaultIssueType.color as string }}
										/>
									) : null}
									{defaultIssueType.icon && (
										<Image
											src={defaultIssueType.fullIconUrl as string}
											alt={defaultIssueType.name}
											width={16}
											height={16}
											decoding="async"
											data-nimg="1"
											loading="lazy"
											className="size-4 shrink-0"
										/>
									)}
									<Tooltip
										label={defaultIssueType.name as string}
										// enabled={defaultIssueType.description.length >= CHARACTER_LIMIT_TO_SHOW}
										placement="auto"
										className="min-w-0"
									>
										<Text.Label
											className={clsxm(
												'ml-0 block max-w-[10rem] truncate font-normal capitalize text-foreground dark:text-foreground'
											)}
										>
											{defaultIssueType.name}
										</Text.Label>
									</Tooltip>
									<div className="flex shrink-0 items-center">
										{editIssueTypeLoading ? (
											<SpinnerLoader size={16} className="mx-2" />
										) : (
											<Tooltip label={t('common.EDIT')}>
												<DropdownMenu>
													<DropdownMenuTrigger className="flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground">
														<EditPenUnderlineIcon className="size-4 text-inherit" />
													</DropdownMenuTrigger>
													<DropdownMenuContent className="min-w-[12rem] rounded-md border border-border bg-card p-1 shadow-lg">
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
																			'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-muted focus:bg-muted'
																		)}
																		key={index}
																	>
																		{issue.color ? (
																			<span
																				aria-hidden="true"
																				className="size-2.5 shrink-0 rounded-full ring-1 ring-inset ring-foreground/10"
																				style={{ backgroundColor: issue.color }}
																			/>
																		) : null}
																		<Image
																			src={issue.fullIconUrl as string}
																			alt={issue.name}
																			width={16}
																			height={16}
																			decoding="async"
																			data-nimg="1"
																			loading="lazy"
																			className="size-4 shrink-0"
																		/>
																		<div className="truncate">{issue.name}</div>
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
			</form>
		</>
	);
};
