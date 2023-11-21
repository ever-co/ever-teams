/* eslint-disable no-mixed-spaces-and-tabs */
import { useAuthenticateUser, useModal, useOrganizationTeams, useUser } from '@app/hooks';
import { Button, Text } from 'lib/components';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RemoveModal } from './remove-modal';
type RemoveModalType = 'REMOVE' | 'DELETE' | 'DELETE_ALL' | string;
type ActionFunction = () => void;

export const DangerZone = () => {
	const { t } = useTranslation();
	const { isOpen, closeModal, openModal } = useModal();
	const [removeModalType, setRemoveModalType] = useState<RemoveModalType>('');

	const { deleteUser, deleteUserLoading } = useUser();
	const { user } = useAuthenticateUser();

	const { removeUserFromAllTeam, removeUserFromAllTeamLoading } = useOrganizationTeams();
	const handleRemoveUser = useCallback(() => {
		if (user) {
			return removeUserFromAllTeam(user.id);
		}
	}, [user, removeUserFromAllTeam]);

	const handleDeleteAllUserData = useCallback(() => {
		console.log(user);
	}, [user]);

	const actionTypes: Record<RemoveModalType, ActionFunction> = {
		DELETE: deleteUser,
		DELETE_ALL: handleDeleteAllUserData,
		REMOVE: handleRemoveUser
	};
	const modalMessages: Record<RemoveModalType, string> = {
		REMOVE: t('pages.settingsPersonal.ABOUT_TO_REMOVE_FROM_ALL_TEAMS'),
		DELETE: t('pages.settingsPersonal.ABOUT_TO_DELETE_ACCOUNT'),
		DELETE_ALL: t('pages.settingsPersonal.ABOUT_TO_DELETE_ALL_ACCOUNT_DATA')
	};
	const messageToShow = modalMessages[removeModalType] || '';
	const onAction = actionTypes[removeModalType] || handleRemoveUser;

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
						<div className="flex flex-col items-center justify-between w-full gap-6 mt-5 sm:flex-row">
							<div className="flex-auto w-64"></div>
							<div className="flex-auto sm:w-64">
								<Text className="font-normal text-center text-gray-400 text-md sm:text-left">
									{t('alerts.ALERT_REMOVE_ALL_DATA')}
								</Text>
							</div>
							<div className="flex-auto w-32">
								<Button
									variant="danger"
									type="submit"
									className="float-right w-full bg-[#DE5536]"
									onClick={() => {
										setRemoveModalType('DELETE_ALL');
										openModal();
									}}
								>
									{t('common.DELETE_ALL_DATA')}
								</Button>
							</div>
						</div>
					</div>
				</div>

				<RemoveModal
					open={removeModalType && isOpen ? true : false}
					close={closeModal}
					title={messageToShow}
					onAction={onAction}
					loading={deleteUserLoading || removeUserFromAllTeamLoading}
				/>
			</div>
		</>
	);
};
