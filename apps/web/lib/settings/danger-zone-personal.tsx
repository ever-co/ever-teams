/* eslint-disable no-mixed-spaces-and-tabs */
import {
	useModal,
	useAuthenticateUser,
	useOrganizationTeams,
	useUser,
} from '@app/hooks';
import { Button, Text } from 'lib/components';
import { useState, useCallback } from 'react';
import { useTranslation } from 'lib/i18n';
import { RemoveModal } from './remove-modal';

export const DangerZone = () => {
	const { trans } = useTranslation();
	const { isOpen, closeModal, openModal } = useModal();
	const [removeModalType, setRemoveModalType] = useState<
		'REMOVE' | 'DELETE' | null
	>(null);

	const { deleteUser, deleteUserLoading } = useUser();
	const { user } = useAuthenticateUser();
	const { removeUserFromAllTeam, removeUserFromAllTeamLoading } =
		useOrganizationTeams();

	const handleRemoveUser = useCallback(() => {
		if (user) {
			return removeUserFromAllTeam(user.id);
		}
	}, [user, removeUserFromAllTeam]);

	return (
		<>
			<div className="flex flex-col justify-between items-center">
				<div className="w-full mt-5">
					<div className="">
						<div className="flex w-full items-center justify-between gap-6">
							<div className="flex-auto w-64">
								<Text className="text-xl  font-normal">Remove Account</Text>
							</div>
							<div className="flex-auto w-64">
								<Text className="text-md text-gray-400 font-normal">
									Account will be removed from all teams, except where you are
									only the manager
								</Text>
							</div>
							<div className="flex-auto w-32">
								<Button
									variant="danger"
									type="submit"
									className="float-right w-full bg-[#DE5536]"
									onClick={() => {
										setRemoveModalType('REMOVE');
										openModal();
									}}
								>
									Remove Everywhere
								</Button>
							</div>
						</div>
						<div className="flex w-full items-center justify-between gap-6 mt-5">
							<div className="flex-auto w-64">
								<Text className="text-xl  font-normal">Delete Account</Text>
							</div>
							<div className="flex-auto w-64">
								<Text className="text-md text-gray-400 font-normal">
									Your Account will be deleted permanently with removing from
									all teams
								</Text>
							</div>
							<div className="flex-auto w-32">
								<Button
									variant="danger"
									type="submit"
									className="float-right w-full bg-[#DE5536]"
									onClick={() => {
										setRemoveModalType('DELETE');
										openModal();
									}}
								>
									Delete This Account
								</Button>
							</div>
						</div>
					</div>
				</div>

				<RemoveModal
					open={removeModalType && isOpen ? true : false}
					close={closeModal}
					title={
						removeModalType === 'DELETE'
							? trans.pages.settingsPersonal.ABOUT_TO_DELETE_ACCOUNT
							: trans.pages.settingsPersonal.ABOUT_TO_REMOVE_ACCOUNT
					}
					onAction={
						removeModalType === 'DELETE' ? deleteUser : handleRemoveUser
					}
					loading={deleteUserLoading || removeUserFromAllTeamLoading}
				/>
			</div>
		</>
	);
};
