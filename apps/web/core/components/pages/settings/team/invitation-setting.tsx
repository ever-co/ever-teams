import { useModal, useRequestToJoinTeam } from '@/core/hooks';
import { Button, NoData } from '@/core/components';
import { SearchNormalIcon } from 'assets/svg';
import { InviteFormModal } from '@/core/components/features/teams/invite-form-modal';
import { ChangeEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { InvitationTable } from '../../../teams/invite/invitation-table';
import { InputField } from '@/core/components/duplicated-components/_input';
import { getTeamInvitationsState } from '@/core/stores';
import { useAtomValue } from 'jotai';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';

export const InvitationSetting = () => {
	const t = useTranslations();

	const teamInvitations = useAtomValue(getTeamInvitationsState);
	const { getRequestToJoin, requestToJoin } = useRequestToJoinTeam();

	const { data: user } = useUserQuery();
	const { openModal, isOpen, closeModal } = useModal();

	const [filterString, setFilterString] = useState<string>('');

	useEffect(() => {
		getRequestToJoin();
	}, [getRequestToJoin]);

	const invitations = [...teamInvitations, ...requestToJoin].filter(
		(invitation) =>
			invitation?.fullName?.toLowerCase()?.includes(filterString) ||
			invitation?.email?.toLowerCase()?.includes(filterString)
	);

	return (
		<div className="flex overflow-auto flex-col">
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
				<div className="flex gap-0 justify-between items-center w-auto md:gap-4">
					{/* TODO: Will imlement Sort/FIlter logic in future */}
					{/* <FilterDropdown setValue={() => console.log('filter')} /> */}
					<Button
						variant="primary"
						className="font-normal rounded-xl text-md  h-[45px] min-w-[120px]"
						onClick={openModal}
					>
						{'+  Invite'}
					</Button>
				</div>
			</div>
			{invitations.length > 0 ? (
				<div className="mt-7 mb-8">
					<InvitationTable invitations={invitations} />
				</div>
			) : (
				<NoData text={t('pages.settingsTeam.NO_INVITATIONS')} />
			)}

			{/* TODO Dynamic */}
			{/* <Divider className="mb-9" />
			<div className="flex flex-col gap-8">
				<div className="flex gap-16 items-center">
					<div className="flex gap-1 items-start">
						<Text className="flex-none font-normal text-[#7E7991] dark:text-white flex-grow-0 text-lg md-2">
							{t('pages.settingsTeam.INVITATION_EXPIRATION')}
						</Text>
						<SettingGearIcon className="stroke-[#B1AEBC] dark:stroke-white" />
					</div>
					<div className="flex items-center">
						<div className="flex gap-4 items-center flex-col sm:flex-row w-[29.7rem]">
							<div className="flex flex-row mb-0">
								<InputField
									type="text"
									placeholder="https//:teamsA.gauzy.com"
									className="mb-0 h-14 w-[14.6rem] text-[ rgba(40, 32, 72, 0.4)] dark:text-white text-sm  font-normal"
									wrapperClassName="mb-0 h-14 rounded-lg text-[rgba(40, 32, 72, 0.4)] dark:text-white text-base font-medium"
									disabled={true}
								/>
							</div>
							<div className="flex flex-row">
								<Button
									variant="outline"
									className="p-0 w-28 min-w-max h-14 text-base font-semibold rounded-xl border-2"
									type="button"
									onClick={() => {
										setCopied(true);
										setTimeout(() => {
											setCopied(false);
										}, 1000 * 10);
									}}
								>
									{!copied ? 'Copy Link' : 'Copied'}
								</Button>
							</div>
						</div>
						<div>
							<DayDropdown setValue={() => console.log('')} />
						</div>
					</div>
				</div>
				<div className="flex items-center">
					<div className="flex items-start gap-1 w-[16.5rem]">
						<Text className="flex-none font-normal text-[#7E7991] flex-grow-0 text-lg md-2 dark:text-white">
							{t('pages.settingsTeam.NOTIFY_IF')}
						</Text>
					</div>
					<div className="flex items-center">
						<div className="flex gap-10 items-center flex-col sm:flex-row w-[29.7rem]">
							<div className="flex flex-row mb-0">
								<NotifyDropdown setValue={() => console.log('')} />
							</div>
							<Text className="text-base font-semibold">Once At</Text>
						</div>
						<div>
							<DayDropdown setValue={() => console.log('')} />
						</div>
					</div>
				</div>
				<div className="flex gap-20 items-start">
					<Text className="flex-none font-normal text-[#7E7991] flex-grow-0 text-lg md-2 dark:text-white">
						{t('pages.settingsTeam.TEAM_REQUEST')}
					</Text>
					<MemberInfo />
				</div>
			</div> */}

			<InviteFormModal open={isOpen && !!user?.isEmailVerified} closeModal={closeModal} />
		</div>
	);
};
