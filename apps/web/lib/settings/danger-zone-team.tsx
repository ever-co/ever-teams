/* eslint-disable no-mixed-spaces-and-tabs */
import { useAuthenticateUser, useModal, useOrganizationEmployeeTeams, useOrganizationTeams } from '@app/hooks';
import { activeTeamManagersState } from '@app/stores';
import { Button, Text } from 'lib/components';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRecoilValue } from 'recoil';
import { RemoveModal } from './remove-modal';
import { TransferTeamModal } from './transfer-team-modal';

export const DangerZoneTeam = () => {
	const { t } = useTranslation();
	const { isOpen, closeModal, openModal } = useModal();
	const { isOpen: dangerIsOpen, closeModal: dangerCloseModal, openModal: dangerOpenaModal } = useModal();
	const [removeModalType, setRemoveModalType] = useState<'DISPOSE' | 'QUIT' | null>(null);

	const { activeTeam, deleteOrganizationTeam, deleteOrganizationTeamLoading } = useOrganizationTeams();
	const { deleteOrganizationTeamEmployee, deleteOrganizationEmployeeTeamLoading } = useOrganizationEmployeeTeams();
	const { user, isTeamManager } = useAuthenticateUser();
	const activeTeamManagers = useRecoilValue(activeTeamManagersState);

	const handleDisposeTeam = useCallback(() => {
		if (activeTeam) {
			return deleteOrganizationTeam(activeTeam.id);
		}
	}, [activeTeam, deleteOrganizationTeam]);

	const handleQuiteTeam = useCallback(() => {
		if (activeTeam && user) {
			const currentEmployeeDetails = activeTeam.members.find((member) => member.employeeId === user.employee.id);

			if (currentEmployeeDetails && currentEmployeeDetails.id) {
				// Remove from Team API call
				return deleteOrganizationTeamEmployee({
					id: currentEmployeeDetails.id,
					employeeId: currentEmployeeDetails.employeeId,
					organizationId: activeTeam.organizationId,
					tenantId: activeTeam.tenantId
				});
			}
		}
		return;
	}, [activeTeam, user, deleteOrganizationTeamEmployee]);

	return (
		<>
			<div className="flex flex-col items-center justify-between">
				<div className="w-full mt-5">
					<div className="">
						{/* Current User is the Manager of the Team and there are more that 1 Managers */}
						<div className="flex flex-col items-center justify-center w-full gap-6 sm:justify-between sm:flex-row">
							<div className="flex-auto md:w-64">
								<Text className="text-xl font-normal">{t('common.TRANSFERT_OWNERSHIP')}</Text>
							</div>
							<div className="flex-auto md:w-64 sm:w-40">
								<Text className="font-normal text-center text-gray-400 text-md sm:text-left">
									{t('common.TRANSFERT_OWNERSHIP_TO')}
								</Text>
							</div>
							<div className="flex-auto sm:w-10">
								<Button
									variant="danger"
									type="submit"
									className="float-right w-full bg-[#DE5536]"
									onClick={openModal}
									disabled={!(isTeamManager && activeTeamManagers.length >= 2)}
								>
									{t('common.TRANSFER')}
								</Button>
							</div>
						</div>

						{/* Current User is the Only Manager of the Team*/}
						<div className="flex flex-col items-center justify-center w-full gap-6 mt-5 sm:justify-between sm:flex-row">
							<div className="flex-auto md:w-64">
								<Text className="text-xl font-normal text-center sm:text-left">
									{t('common.REMOVE_TEAM')}
								</Text>
							</div>
							<div className="flex-auto md:w-64 sm:w-40">
								<Text className="font-normal text-center text-gray-400 text-md sm:text-left">
									{t('alerts.ALERT_REMOVE_TEAM')}
								</Text>
							</div>
							<div className="flex-auto sm:w-10">
								<Button
									variant="danger"
									type="submit"
									className="float-right w-full bg-[#DE5536]"
									onClick={() => {
										setRemoveModalType('DISPOSE');
										dangerOpenaModal();
									}}
									disabled={!(isTeamManager && activeTeamManagers.length === 1)}
								>
									{t('common.DISPOSE_TEAM')}
								</Button>
							</div>
						</div>

						<div className="flex flex-col items-center justify-center w-full gap-6 mt-5 sm:justify-between sm:flex-row">
							<div className="flex-auto md:w-64">
								<Text className="text-xl font-normal text-center sm:text-left">
									{t('common.QUIT_TEAM')}
								</Text>
							</div>
							<div className="flex-auto md:w-64 sm:w-40">
								<Text className="font-normal text-center text-gray-400 text-md sm:text-left">
									{t('alerts.ALERT_QUIT_TEAM')}
								</Text>
							</div>
							<div className="flex-auto sm:w-10">
								<Button
									variant="danger"
									type="submit"
									className="float-right w-full bg-[#DE5536]"
									onClick={() => {
										setRemoveModalType('QUIT');
										dangerOpenaModal();
									}}
									disabled={
										!(
											(isTeamManager && activeTeamManagers.length > 1) ||
											(!isTeamManager &&
												activeTeam?.members?.some(
													(member) => member.employee.userId === user?.id
												))
										)
									}
								>
									{t('common.QUIT')}
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Transfer Team Modal */}
			<TransferTeamModal open={isOpen} closeModal={closeModal} />

			<RemoveModal
				open={removeModalType && dangerIsOpen ? true : false}
				close={dangerCloseModal}
				title={
					removeModalType === 'DISPOSE'
						? t('pages.settingsTeam.DISPOSE_TEAM')
						: t('pages.settingsTeam.QUIT_TEAM')
				}
				onAction={removeModalType === 'DISPOSE' ? handleDisposeTeam : handleQuiteTeam}
				loading={deleteOrganizationTeamLoading || deleteOrganizationEmployeeTeamLoading}
			/>
		</>
	);
};
