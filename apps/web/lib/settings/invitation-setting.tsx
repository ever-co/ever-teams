import { useAuthenticateUser, useModal, useTeamInvitations } from '@app/hooks';
import { Button, InputField } from 'lib/components';
import { SearchNormalIcon } from 'lib/components/svgs';
import { InviteFormModal } from 'lib/features/team/invite/invite-form-modal';
import { useTranslation } from 'lib/i18n';
import { InvitationTable } from './invitation-table';

export const InvitationSetting = () => {
	const { trans } = useTranslation('settingsTeam');

	const { teamInvitations } = useTeamInvitations();

	const { user } = useAuthenticateUser();
	const { openModal, isOpen, closeModal } = useModal();

	return (
		<div className="flex flex-col ">
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
					/>
				</div>
				<div className="flex items-center justify-between w-auto gap-4">
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

			<div className="mt-7 mb-[4rem]">
				<InvitationTable invitations={teamInvitations} />
			</div>

			<InviteFormModal
				open={isOpen && !!user?.isEmailVerified}
				closeModal={closeModal}
			/>
		</div>
	);
};
