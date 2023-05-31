import { Button, InputField, Text } from 'lib/components';
import { SearchNormalIcon } from 'lib/components/svgs';
import { useTranslation } from 'lib/i18n';
import { FilterDropdown } from './filter-by-dropdown';
import { SortDropdown } from './sort-by-dropdown';
import MemberInfo from 'lib/components/memberInfoToggle';
import { InvitationExpireDropdown } from './invitation-expire-dropdown';
import { MemberTable } from './member-table';
import { useOrganizationTeams } from '@app/hooks';
import { ChangeEvent, useState } from 'react';
import moment from 'moment';

export const MemberSetting = () => {
	const { trans } = useTranslation('settingsTeam');

	const { activeTeam } = useOrganizationTeams();
	const [filterString, setFilterString] = useState<string>('');
	const [filterBy, setFilterBy] = useState<string | undefined>('Name');

	return (
		<div className="flex flex-col ">
			<Text className="flex-none flex-grow-0 text-xl text-gray-400 font-normal mb-2 w-1/5">
				{trans.MEMBER_AND_ROLES}
			</Text>
			<div className="flex items-center justify-between w-full mt-8">
				<div className="w-auto">
					<InputField
						type="text"
						placeholder={trans.SEARCH_MEMBER}
						className="mb-0 bg-[#FCFCFC] h-11"
						leadingNode={
							<Button
								variant="ghost"
								className="p-0 m-0 ml-[0.9rem] min-w-0 bg-[#FCFCFC]"
								type="submit"
							>
								<SearchNormalIcon className="w-[1rem] bg-[#FCFCFC]" />
							</Button>
						}
						onChange={(e: ChangeEvent<HTMLInputElement>) => {
							setFilterString(e.target.value);
						}}
					/>
				</div>
				<div className="flex items-center justify-between w-auto gap-4">
					<SortDropdown setValue={() => console.log('sort')} />
					<FilterDropdown setValue={setFilterBy} />

					<Button
						variant="primary"
						className="font-normal rounded-xl text-md  "
						type="submit"
					>
						{'+ Invite'}
					</Button>
				</div>
			</div>

			<div className="mt-7 mb-[4rem]">
				<MemberTable
					members={
						activeTeam?.members.filter((member) =>
							!filterString
								? true
								: filterBy === 'Name'
								? member.employee.fullName.toLowerCase().includes(filterString)
								: filterBy === 'Roles'
								? member.role?.name.toLowerCase().includes(filterString)
								: filterBy === 'Joined/Left'
								? moment(member.employee.createdAt)
										.format('DD MMM YYYY hh:mm a')
										.toLowerCase()
										.includes(filterString)
								: member.employee.fullName.toLowerCase().includes(filterString)
						) || []
					}
				/>
			</div>
			<div className="flex w-full items-center justify-between gap-12">
				<Text className="flex-none font-normal text-gray-400 flex-grow-0 text-md md-2 w-1/5">
					{trans.INVITATION_EXPIRATION}
				</Text>
				<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
					<InvitationExpireDropdown setValue={() => console.log('sort')} />
				</div>
			</div>
			<div className="flex w-full items-center justify-between gap-12">
				<Text className="flex-none font-normal text-gray-400 flex-grow-0 text-md md-2 w-1/5">
					{trans.HIDE_PERSONAL_MEMBERS_INFOTMATION}
				</Text>
				<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
					<MemberInfo />
				</div>
			</div>
			<div className="flex w-full items-center justify-between gap-12">
				<Text className="flex-none font-normal text-gray-400 flex-grow-0 text-md md-2 w-1/5">
					{trans.WORK_SCHEDULE}
				</Text>
			</div>
		</div>
	);
};
