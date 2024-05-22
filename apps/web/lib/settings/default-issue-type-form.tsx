/* eslint-disable no-mixed-spaces-and-tabs */
import { Text } from 'lib/components';

import { useTranslations } from 'next-intl';
import { useIssueType } from '@app/hooks';
import { IIssueTypesItemList } from '@app/interfaces';
import { StatusDropdown } from 'lib/features';
import { StatusesListCard } from './list-card';

export const DefaultIssueTypeForm = () => {
	const t = useTranslations();
	const { issueTypes, editIssueType } = useIssueType();
	const defaultIssueType: IIssueTypesItemList = issueTypes.find((issue) => !issue.isDefault) as IIssueTypesItemList;

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
								<StatusDropdown
									// sidebarUI={props.sidebarUI}
									// className={props.className}
									// items={props.forParentChildRelationship ? updatedItemsBasedOnTaskIssueType : items}
									// value={item || (taskIssues['Task'] as Required<TStatusItem>)}
									defaultItem={undefined}
									onChange={() => {
										console.log('On change');
									}}
									// issueType="issue"
									items={issueTypes}
									value={issueTypes[0]}
								/>
								<StatusesListCard
									statusTitle={defaultIssueType?.name || 'No Default Issue Type'}
									bgColor={defaultIssueType.color as string}
									statusIcon={defaultIssueType.icon as string}
									showDeleteButton={false}
									onEdit={() => {
										// await editIssueType(defaultIssueType.id);
									}}
									onDelete={() => {
										console.log('click delete');
									}}
								/>
							</div>
						</div>
					</div>
				</div>
			</form>
		</>
	);
};
