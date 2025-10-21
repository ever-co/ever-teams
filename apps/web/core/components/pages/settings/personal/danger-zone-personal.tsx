/* eslint-disable no-mixed-spaces-and-tabs */
import { useModal, useOrganizationTeams, useUser } from '@/core/hooks';
import { Button, Text } from '@/core/components';
import Image from 'next/image';
import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { RemoveModal } from '../../../settings/remove-modal';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
type RemoveModalType = 'REMOVE' | 'DELETE' | 'DELETE_ALL' | string;
type ActionFunction = () => void;

export const DangerZone = () => {
	const t = useTranslations();
	const { isOpen, closeModal, openModal } = useModal();
	const [removeModalType, setRemoveModalType] = useState<RemoveModalType>('');

	const { deleteUser, deleteUserLoading } = useUser();
	const { data: user } = useUserQuery();

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
			<div className="flex flex-col justify-between items-center">
				<div className="mt-5 w-full">
					<div className="">
						<div className="flex flex-col gap-6 justify-between items-center w-full lg:flex-row">
							<div className="flex flex-auto justify-center items-center opacity-50 sm:w-32">
								<Image alt="Danger zone" src="/assets/svg/danger-zones.svg" width={150} height={150} />
							</div>
							<div className="flex-auto sm:w-96">
								<div className="flex flex-col gap-6 justify-between items-center w-full sm:flex-row">
									<div className="flex-auto sm:w-64">
										<Text className="font-normal text-gray-400 text-md">
											{t('alerts.ALERT_DELETE_ACCOUNT')}
										</Text>
									</div>
									<div className="flex-auto w-full lg:w-32">
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
								<div className="flex flex-col gap-6 justify-between items-center mt-5 w-full sm:flex-row">
									<div className="flex-auto sm:w-64">
										<Text className="font-normal text-center text-gray-400 text-md sm:text-left">
											{t('alerts.ALERT_ACCOUNT_PERMANENT_DELETE')}
										</Text>
									</div>
									<div className="flex-auto w-full lg:w-32">
										<Button
											variant="danger"
											type="submit"
											className="float-right w-full bg-[#DE5536] text-nowrap whitespace-nowrap min-w-32 px-3.5"
											onClick={() => {
												setRemoveModalType('DELETE');
												openModal();
											}}
										>
											{t('common.DELETE_ACCOUNT')}
										</Button>
									</div>
								</div>
								<div className="flex flex-col gap-6 justify-between items-center mt-5 w-full sm:flex-row">
									<div className="flex-auto sm:w-64">
										<Text className="font-normal text-center text-gray-400 text-md sm:text-left">
											{t('alerts.ALERT_REMOVE_ALL_DATA')}
										</Text>
									</div>
									<div className="flex-auto w-full lg:w-32">
										<Button
											variant="danger"
											type="submit"
											className="float-right w-full bg-[#DE5536] text-nowrap whitespace-nowrap min-w-32 px-3.5"
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
