/* eslint-disable no-mixed-spaces-and-tabs */
import {
	useAuthenticateUser,
	useModal,
	useOrganizationEmployeeTeams,
	useOrganizationTeams,
} from '@app/hooks';
import { activeTeamManagersState } from '@app/stores';
import { Button, Text } from 'lib/components';
import { useCallback, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { TransferTeamModal } from './transfer-team-modal';
import { RemoveModal } from './remove-modal';
import { useTranslation } from 'lib/i18n';

export const DangerZoneTeam = () => {
	const { trans } = useTranslation();
	const { isOpen, closeModal, openModal } = useModal();
	const {
		isOpen: dangerIsOpen,
		closeModal: dangerCloseModal,
		openModal: dangerOpenaModal,
	} = useModal();
	const [removeModalType, setRemoveModalType] = useState<
		'DISPOSE' | 'QUIT' | null
	>(null);

	const { activeTeam, deleteOrganizationTeam, deleteOrganizationTeamLoading } =
		useOrganizationTeams();
	const {
		deleteOrganizationTeamEmployee,
		deleteOrganizationEmployeeTeamLoading,
	} = useOrganizationEmployeeTeams();
	const { user, isTeamManager } = useAuthenticateUser();
	const activeTeamManagers = useRecoilValue(activeTeamManagersState);

	const handleDisposeTeam = useCallback(() => {
		if (activeTeam) {
			return deleteOrganizationTeam(activeTeam.id);
		}
	}, [activeTeam, deleteOrganizationTeam]);

	const handleQuiteTeam = useCallback(() => {
		if (activeTeam && user) {
			const currentEmployeeDetails = activeTeam.members.find(
				(member) => member.employeeId === user.employee.id
			);

			if (currentEmployeeDetails && currentEmployeeDetails.id) {
				// Remove from Team API call
				return deleteOrganizationTeamEmployee({
					id: currentEmployeeDetails.id,
					employeeId: currentEmployeeDetails.employeeId,
					organizationId: activeTeam.organizationId,
					tenantId: activeTeam.tenantId,
				});
			}
		}
		return;
	}, [activeTeam, user, deleteOrganizationTeamEmployee]);

	return (
		<>
			<div className="flex flex-col justify-between items-center">
				<div className="w-full mt-5">
					<div className="">
						{/* Current User is the Manager of the Team and there are more that 1 Managers */}
						<div className="flex w-full items-center justify-between gap-6">
							<div className="flex-auto w-64">
								<Text className="text-xl  font-normal">Transfer Ownership</Text>
							</div>
							<div className="flex-auto w-64">
								<Text className="text-md text-gray-400 font-normal">
									Transfer full ownership of team to another user
								</Text>
							</div>
							<div className="flex-auto w-10">
								<Button
									variant="danger"
									type="submit"
									className="float-right w-full bg-[#DE5536]"
									onClick={openModal}
									disabled={!(isTeamManager && activeTeamManagers.length >= 2)}
								>
									Transfer
								</Button>
							</div>
						</div>

						{/* Current User is the Only Manager of the Team*/}
						<div className="flex w-full items-center justify-between gap-6 mt-5">
							<div className="flex-auto w-64">
								<Text className="text-xl  font-normal">Remove Team</Text>
							</div>
							<div className="flex-auto w-64">
								<Text className="text-md text-gray-400 font-normal">
									Team will be completely removed for the system and team
									members lost access
								</Text>
							</div>
							<div className="flex-auto w-10">
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
									Dispose Team
								</Button>
							</div>
						</div>

						<div className="flex w-full items-center justify-between gap-6 mt-5">
							<div className="flex-auto w-64">
								<Text className="text-xl  font-normal">Quit the Team</Text>
							</div>
							<div className="flex-auto w-64">
								<Text className="text-md text-gray-400 font-normal">
									You are about to quit the team
								</Text>
							</div>
							<div className="flex-auto w-10">
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
									Quit
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
						? trans.pages.settingsTeam.DISPOSE_TEAM
						: trans.pages.settingsTeam.QUIT_TEAM
				}
				onAction={
					removeModalType === 'DISPOSE' ? handleDisposeTeam : handleQuiteTeam
				}
				loading={
					deleteOrganizationTeamLoading || deleteOrganizationEmployeeTeamLoading
				}
			/>
		</>
	);
};
