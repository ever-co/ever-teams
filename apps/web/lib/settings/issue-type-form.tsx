/* eslint-disable no-mixed-spaces-and-tabs */
import { Button, InputField, Text } from 'lib/components';
import { StatusesListCard } from './list-card';

import { useTranslation } from 'lib/i18n';

export const IssueTypeForm = () => {
	const { trans } = useTranslation('settingsTeam');

	return (
		<>
			<form className="w-full" autoComplete="off">
				<div className="flex w-full">
					<div className="rounded-md m-h-64 p-[32px] pl-0 pr-0 flex gap-x-[2rem] w-full">
						<Text className="flex-none flex-grow-0 text-md text-gray-400 font-medium mb-2 w-[200px]">
							{trans.ISSUETYPE}
						</Text>

						<div className="flex flex-col w-full">
							<>
								<Text className="flex-none flex-grow-0 text-md text-gray-400 font-medium mb-2 w-full">
									New Issue
								</Text>
								<div className="flex  w-full gap-x-5 items-center mt-3">
									<InputField
										type="text"
										placeholder="Create Version"
										className="mb-0 w-full"
										wrapperClassName="mb-0 w-full"
									/>
								</div>
								<div className="flex gap-x-4 mt-5">
									<Button
										variant="primary"
										className="font-normal py-4 px-4 rounded-xl text-md"
										type="submit"
									>
										Create
									</Button>
									<Button
										variant="grey"
										className="font-normal py-4 px-4 rounded-xl text-md"
									>
										Cancel
									</Button>
								</div>
							</>
							<Text className="flex-none flex-grow-0 text-md text-gray-400 font-medium mb-[1rem] w-full mt-[2.4rem]">
								{trans.LIST_OF_ISSUES}
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
