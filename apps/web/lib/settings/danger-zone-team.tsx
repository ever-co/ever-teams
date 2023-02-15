/* eslint-disable no-mixed-spaces-and-tabs */
import {
	useAuthenticateUser,
	useModal,
	useOrganizationTeams,
} from '@app/hooks';
import { useOrganizationEmployeeTeams } from '@app/hooks/features/useOrganizatioTeamsEmployee';
import { activeTeamManagersState } from '@app/stores';
import { Button, Text } from 'lib/components';
import { useCallback } from 'react';
import { useRecoilValue } from 'recoil';
import { TransferTeamModal } from './transfer-team-modal';

export const DangerZoneTeam = () => {
	const { activeTeam, deleteOrganizationTeam } = useOrganizationTeams();
	const { deleteOrganizationTeamEmployee } = useOrganizationEmployeeTeams();
	const { user, isTeamManager } = useAuthenticateUser();
	const activeTeamManagers = useRecoilValue(activeTeamManagersState);

	const { isOpen, closeModal, openModal } = useModal();

	const handleDisposeTeam = useCallback(() => {
		if (activeTeam) {
			deleteOrganizationTeam(activeTeam.id);
		}
	}, [activeTeam, deleteOrganizationTeam]);

	const handleQuiteTeam = useCallback(() => {
		if (activeTeam && user) {
			const currentEmployeeDetails = activeTeam.members.find(
				(member) => member.employeeId === user.employee.id
			);

			if (currentEmployeeDetails && currentEmployeeDetails.id) {
				// Remove from Team API call
				deleteOrganizationTeamEmployee({
					id: currentEmployeeDetails.id,
					employeeId: currentEmployeeDetails.employeeId,
					organizationId: activeTeam.organizationId,
					tenantId: activeTeam.tenantId,
				});
			}
		}
	}, [activeTeam, user, deleteOrganizationTeamEmployee]);

	return (
		<>
			<div className="flex flex-col justify-between items-center">
				<div className="w-full mt-5">
					<div className="">
						{/* Current User is the Manager of the Team and there are more that 1 Managers */}
						{isTeamManager && activeTeamManagers.length >= 2 ? (
							<div className="flex w-full items-center justify-between gap-6">
								<div className="flex-auto w-64">
									<Text className="text-xl  font-normal">
										Transfer Ownership
									</Text>
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
									>
										Transfer
									</Button>
								</div>
							</div>
						) : (
							<></>
						)}

						{/* Current User is the Only Manager of the Team*/}
						{isTeamManager && activeTeamManagers.length === 1 ? (
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
											handleDisposeTeam();
										}}
									>
										Dispose Team
									</Button>
								</div>
							</div>
						) : (
							<></>
						)}

						{((isTeamManager && activeTeamManagers.length > 1) ||
							!isTeamManager) && (
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
											handleQuiteTeam();
										}}
									>
										Quit
									</Button>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Transfer Team Modal */}
			<TransferTeamModal open={isOpen} closeModal={closeModal} />
		</>
	);
};
