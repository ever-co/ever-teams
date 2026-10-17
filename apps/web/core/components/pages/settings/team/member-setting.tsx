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
		<div className="flex flex-col gap-3">
			<Text className="text-sm font-semibold text-foreground">{t('pages.settingsTeam.MEMBER_AND_ROLES')}</Text>
			<div className="flex w-full flex-wrap items-center justify-between gap-2">
				<InputField
					type="text"
					placeholder={t('pages.settingsTeam.SEARCH_MEMBER')}
					className="mb-0 h-9 pl-1"
					wrapperClassName="mb-0 w-full max-w-xs"
					leadingNode={
						<Button
							variant="ghost"
							className="ml-1 size-7 min-w-0 shrink-0 rounded-md p-0 text-muted-foreground"
							type="submit"
						>
							<SearchNormalIcon className="size-4" />
						</Button>
					}
					onChange={(e: ChangeEvent<HTMLInputElement>) => {
						setFilterString(e.target.value ? e.target.value.toLowerCase() : '');
					}}
				/>
			</div>

			{members.length > 0 ? (
				<MemberTable members={members as any} />
			) : (
				<NoData text={t('pages.settingsTeam.NO_MEMBERS')} />
			)}

			{/* TODO Dynamic */}
			{/* <div className="mb-9 bg-[#E8E7EB] w-full h-[1px]"></div>
			<div className="flex flex-col gap-8">
				<div className="flex gap-12">
					<div className="flex w-[26.5rem] items-center justify-between gap-[8.1rem]">
						<Text className="flex-none font-normal text-[#7E7991] grow-0 text-lg md-2 w-auto dark:text-white">
							{t('pages.settingsTeam.POSITION_CUSTOM')}
						</Text>
						<div className="flex flex-row grow-0 justify-between items-center w-auto">
							<MemberInfo />
						</div>
					</div>
					<ChooseDropdown setValue={() => console.log('')} />
				</div>
				<div className="flex gap-12 justify-between items-center w-full">
					<Text className="flex-none font-normal text-[#7E7991] grow-0 text-lg md-2 w-1/4 dark:text-white">
						{t('pages.settingsTeam.HIDE_PERSONAL_MEMBERS_INFOTMATION')}
					</Text>
					<div className="flex flex-row grow-0 justify-between items-center w-4/5">
						<MemberInfo />
					</div>
				</div>
				<div className="flex gap-12 justify-between items-center w-full">
					<Text className="flex-none font-normal text-[#7E7991] grow-0 text-lg md-2 w-1/5 dark:text-white">
						{t('pages.settingsTeam.WORK_SCHEDULE')}
					</Text>
				</div>
			</div> */}

			<InviteFormModal open={isOpen && !!user?.isEmailVerified} closeModal={closeModal} />
		</div>
	);
};
