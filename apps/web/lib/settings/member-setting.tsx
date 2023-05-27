import { Button, InputField, Text } from 'lib/components';
import { SearchNormalIcon } from 'lib/components/svgs';
import { useTranslation } from 'lib/i18n';
import { FilterDropdown } from './filter-by-dropdown';
import { SortDropdown } from './sort-by-dropdown';
import MemberInfo from 'lib/components/memberInfoToggle';
import { InvitationExpireDropdown } from './invitation-expire-dropdown';
import { MemberTable } from './member-table';

export const MemberSetting = () => {
	const { trans } = useTranslation('settingsTeam');
	return (
		<div className="flex flex-col ">
			<Text className="flex-none flex-grow-0 text-xl text-gray-400 font-normal mb-2 w-1/5">
				{trans.MEMBER_AND_ROLES}
			</Text>
			<div className="flex items-center justify-between w-full mt-8">
				<div className="w-[25%]">
					<InputField
						type="text"
						placeholder={trans.SEARCH_MEMBER}
						className=" mb-0"
						leadingNode={
							<Button
								variant="ghost"
								className="p-0 m-0 ml-[0.9rem] min-w-0"
								type="submit"
							>
								<SearchNormalIcon className="w-[1rem]" />
							</Button>
						}
					/>
				</div>
				<div className="flex items-center justify-between w-[50%] gap-x-[2%]">
					<FilterDropdown setValue={() => console.log('filter')} />
					<SortDropdown setValue={() => console.log('sort')} />

					<Button
						variant="primary"
						className="font-normal rounded-xl text-md  "
						type="submit"
					>
						+ Invite
					</Button>
				</div>
			</div>

			<div className="mt-7 mb-[4rem]">
				<MemberTable />
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
