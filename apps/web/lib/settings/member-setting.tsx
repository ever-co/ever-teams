import { Button, InputField, NoData, Text } from 'lib/components';
import { SearchNormalIcon } from 'lib/components/svgs';
import { useTranslation } from 'lib/i18n';
import { MemberTable } from './member-table';
import {
	useAuthenticateUser,
	useModal,
	useOrganizationTeams
} from '@app/hooks';
import { ChangeEvent, useState } from 'react';
import { InviteFormModal } from 'lib/features/team/invite/invite-form-modal';

export const MemberSetting = () => {
	const { trans } = useTranslation('settingsTeam');

	const { activeTeam } = useOrganizationTeams();
	const [filterString, setFilterString] = useState<string>('');

	const { user } = useAuthenticateUser();
	const { isOpen, closeModal } = useModal();

	const members =
		activeTeam?.members.filter(
			(member) =>
				member.employee.fullName.toLowerCase().includes(filterString) ||
				member.employee.user?.email.toLowerCase().includes(filterString)
		) || [];

	return (
		<div className="flex flex-col">
			<Text className="flex-none flex-grow-0 text-xl text-gray-400 font-normal mb-2 w-1/5 mt-8">
				{trans.MEMBER_AND_ROLES}
			</Text>
			<div className="flex items-center justify-between w-full mt-8">
				<div className="w-auto">
					<InputField
						type="text"
						placeholder={trans.SEARCH_MEMBER}
						className="mb-0 h-11"
						leadingNode={
							<Button
								variant="ghost"
								className="p-0 m-0 ml-[0.9rem] min-w-0"
								type="submit"
							>
								<SearchNormalIcon className="w-[1rem] dark:stroke-[#ffffff] " />
							</Button>
						}
						onChange={(e: ChangeEvent<HTMLInputElement>) => {
							setFilterString(
								e.target.value ? e.target.value.toLowerCase() : ''
							);
						}}
					/>
				</div>
			</div>

			{members.length > 0 ? (
				<div className="mt-7 mb-8">
					<MemberTable members={members} />
				</div>
			) : (
				<NoData text={trans.NO_MEMBERS} />
			)}

			{/* TODO Dynamic */}
			{/* <div className="mb-9 bg-[#E8E7EB] w-full h-[1px]"></div>
			<div className="flex flex-col gap-8">
				<div className="flex gap-12">
					<div className="flex w-[26.5rem] items-center justify-between gap-[8.1rem]">
						<Text className="flex-none font-normal text-[#7E7991] flex-grow-0 text-lg md-2 w-auto dark:text-white">
							{trans.POSITION_CUSTOM}
						</Text>
						<div className="flex flex-row flex-grow-0 items-center justify-between w-auto">
							<MemberInfo />
						</div>
					</div>
					<ChooseDropdown setValue={() => console.log('')} />
				</div>
				<div className="flex w-full items-center justify-between gap-12">
					<Text className="flex-none font-normal text-[#7E7991] flex-grow-0 text-lg md-2 w-1/4 dark:text-white">
						{trans.HIDE_PERSONAL_MEMBERS_INFOTMATION}
					</Text>
					<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
						<MemberInfo />
					</div>
				</div>
				<div className="flex w-full items-center justify-between gap-12">
					<Text className="flex-none font-normal text-[#7E7991] flex-grow-0 text-lg md-2 w-1/5 dark:text-white">
						{trans.WORK_SCHEDULE}
					</Text>
				</div>
			</div> */}

			<InviteFormModal
				open={isOpen && !!user?.isEmailVerified}
				closeModal={closeModal}
			/>
		</div>
	);
};
