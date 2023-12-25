/* eslint-disable no-mixed-spaces-and-tabs */
import { Button, InputField, Text } from 'lib/components';
import { StatusesListCard } from './list-card';

import { useTranslations } from 'next-intl';

export const IssueTypeForm = () => {
	const t = useTranslations();

	return (
		<>
			<form className="w-full" autoComplete="off">
				<div className="flex w-full">
					<div className="rounded-md m-h-64 p-[32px] pl-0 pr-0 flex gap-x-[2rem] w-full">
						<Text className="flex-none flex-grow-0 text-gray-400 text-lg font-normal mb-2 w-[200px]">
							{t('pages.settingsTeam.ISSUETYPE')}
						</Text>

						<div className="flex flex-col w-full">
							<>
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
							</>
							<Text className="flex-none flex-grow-0 text-gray-400 text-lg font-normal mb-[1rem] w-full mt-[2.4rem]">
								{t('pages.settingsTeam.LIST_OF_ISSUES')}
							</Text>
							<div className="flex flex-wrap w-full gap-3">
								<StatusesListCard
									statusTitle={'Bug'}
									bgColor={'#C24A4A'}
									// textColor='white'
									statusIcon={''}
									onEdit={() => {
										console.log('click edit');
									}}
									onDelete={() => {
										console.log('click delete');
									}}
								/>
								<StatusesListCard
									statusTitle={'Story'}
									bgColor={'#54BA95'}
									statusIcon={''}
									// textColor='white'
									onEdit={() => {
										console.log('click edit');
									}}
									onDelete={() => {
										console.log('click delete');
									}}
								/>
								<StatusesListCard
									statusTitle={'Task'}
									bgColor={'#5483BA'}
									statusIcon={''}
									// textColor='white'
									onEdit={() => {
										console.log('click edit');
									}}
									onDelete={() => {
										console.log('click delete');
									}}
								/>
								<StatusesListCard
									statusTitle={'Epic'}
									bgColor={'#8154BA'}
									statusIcon={''}
									// textColor='white'
									onEdit={() => {
										console.log('click edit');
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
