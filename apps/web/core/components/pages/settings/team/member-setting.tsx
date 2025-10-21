import { useModal } from '@/core/hooks';
import { Button, NoData, Text } from '@/core/components';
import { SearchNormalIcon } from 'assets/svg';
import { InviteFormModal } from '@/core/components/features/teams/invite-form-modal';
import { ChangeEvent, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { MemberTable } from '../../../teams/member-table';
import { InputField } from '@/core/components/duplicated-components/_input';
import { activeTeamState } from '@/core/stores';
import { useAtomValue } from 'jotai';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';

export const MemberSetting = () => {
	const t = useTranslations();

	const activeTeam = useAtomValue(activeTeamState);
	const [filterString, setFilterString] = useState<string>('');

	const { data: user } = useUserQuery();
	const { isOpen, closeModal } = useModal();

	const members = useMemo(() => {
		return (
			activeTeam?.members?.filter(
				(member) =>
					member.employee?.fullName?.toLowerCase().includes(filterString) ||
					member.employee?.user?.email?.toLowerCase().includes(filterString)
			) || []
		);
	}, [activeTeam, filterString]);

	return (
		<div className="flex flex-col">
			<Text className="flex-none flex-grow-0 mt-8 mb-2 w-full text-xl font-normal text-gray-400 md:w-1/5">
				{t('pages.settingsTeam.MEMBER_AND_ROLES')}
			</Text>
			<div className="flex justify-between items-center mt-8 w-full">
				<div className="w-auto">
					<InputField
						type="text"
						placeholder={t('pages.settingsTeam.SEARCH_MEMBER')}
						className="mb-0 h-11"
						leadingNode={
							<Button variant="ghost" className="p-0 m-0 ml-[0.9rem] min-w-0" type="submit">
								<SearchNormalIcon className="w-[1rem] dark:stroke-[#ffffff] " />
							</Button>
						}
						onChange={(e: ChangeEvent<HTMLInputElement>) => {
							setFilterString(e.target.value ? e.target.value.toLowerCase() : '');
						}}
					/>
				</div>
			</div>

			{members.length > 0 ? (
				<div className="mt-7 mb-8">
					<MemberTable members={members as any} />
				</div>
			) : (
				<NoData text={t('pages.settingsTeam.NO_MEMBERS')} />
			)}

			{/* TODO Dynamic */}
			{/* <div className="mb-9 bg-[#E8E7EB] w-full h-[1px]"></div>
			<div className="flex flex-col gap-8">
				<div className="flex gap-12">
					<div className="flex w-[26.5rem] items-center justify-between gap-[8.1rem]">
						<Text className="flex-none font-normal text-[#7E7991] flex-grow-0 text-lg md-2 w-auto dark:text-white">
							{t('pages.settingsTeam.POSITION_CUSTOM')}
						</Text>
						<div className="flex flex-row flex-grow-0 justify-between items-center w-auto">
							<MemberInfo />
						</div>
					</div>
					<ChooseDropdown setValue={() => console.log('')} />
				</div>
				<div className="flex gap-12 justify-between items-center w-full">
					<Text className="flex-none font-normal text-[#7E7991] flex-grow-0 text-lg md-2 w-1/4 dark:text-white">
						{t('pages.settingsTeam.HIDE_PERSONAL_MEMBERS_INFOTMATION')}
					</Text>
					<div className="flex flex-row flex-grow-0 justify-between items-center w-4/5">
						<MemberInfo />
					</div>
				</div>
				<div className="flex gap-12 justify-between items-center w-full">
					<Text className="flex-none font-normal text-[#7E7991] flex-grow-0 text-lg md-2 w-1/5 dark:text-white">
						{t('pages.settingsTeam.WORK_SCHEDULE')}
					</Text>
				</div>
			</div> */}

			<InviteFormModal open={isOpen && !!user?.isEmailVerified} closeModal={closeModal} />
		</div>
	);
};
