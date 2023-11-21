/* eslint-disable no-mixed-spaces-and-tabs */
import { useAuthenticateUser, useModal, useOrganizationTeams, useUser } from '@app/hooks';
import { Button, Text } from 'lib/components';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RemoveModal } from './remove-modal';

export const DangerZone = () => {
	const { t } = useTranslation();
	const { isOpen, closeModal, openModal } = useModal();
	const [removeModalType, setRemoveModalType] = useState<'REMOVE' | 'DELETE' | null>(null);

	const { deleteUser, deleteUserLoading } = useUser();
	const { user } = useAuthenticateUser();
	const { removeUserFromAllTeam, removeUserFromAllTeamLoading } = useOrganizationTeams();

	const handleRemoveUser = useCallback(() => {
		if (user) {
			return removeUserFromAllTeam(user.id);
		}
	}, [user, removeUserFromAllTeam]);

	return (
		<>
			<div className="flex flex-col items-center justify-between">
				<div className="w-full mt-5">
					<div className="">
						<div className="flex flex-col items-center justify-between w-full gap-6 sm:flex-row">
							<div className="flex-auto sm:w-64"></div>
							<div className="flex-auto sm:w-64">
								<Text className="font-normal text-gray-400 text-md">
									{t('alerts.ALERT_DELETE_ACCOUNT')}
								</Text>
							</div>
							<div className="flex-auto w-32">
								<Button
									variant="danger"
									type="submit"
									className="float-right w-full !bg-[#FF9B50]"
									onClick={() => {
										setRemoveModalType('REMOVE');
										openModal();
									}}
								>
									{t('common.REMOVE_EVERYWHERE')}
								</Button>
							</div>
						</div>
						<div className="flex flex-col items-center justify-between w-full gap-6 mt-5 sm:flex-row">
							<div className="flex-auto w-64"></div>
							<div className="flex-auto sm:w-64">
								<Text className="font-normal text-center text-gray-400 text-md sm:text-left">
									{t('alerts.ALERT_ACCOUNT_PERMANENT_DELETE')}
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
									{t('common.DELETE_ACCOUNT')}
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
							? t('pages.settingsPersonal.ABOUT_TO_DELETE_ACCOUNT')
							: t('pages.settingsPersonal.ABOUT_TO_REMOVE_ACCOUNT')
					}
					onAction={removeModalType === 'DELETE' ? deleteUser : handleRemoveUser}
					loading={deleteUserLoading || removeUserFromAllTeamLoading}
				/>
			</div>
		</>
	);
};
