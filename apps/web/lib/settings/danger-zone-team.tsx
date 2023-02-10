/* eslint-disable no-mixed-spaces-and-tabs */
import {
	useAuthenticateUser,
	useModal,
	useOrganizationTeams,
} from '@app/hooks';
import { useOrganizationEmployeeTeams } from '@app/hooks/features/useOrganizatioTeamsEmployee';
import { Button, Text } from 'lib/components';
import { useCallback, useEffect } from 'react';
import { TransferTeamModal } from './transfer-team-modal';

export const DangerZoneTeam = () => {
	const { activeTeam, deleteOrganizationTeam } = useOrganizationTeams();
	const { deleteOrganizationTeamEmployee } = useOrganizationEmployeeTeams();
	const { user } = useAuthenticateUser();

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
				deleteOrganizationTeamEmployee(currentEmployeeDetails.id);
			}
		}
	}, [activeTeam, deleteOrganizationTeamEmployee, user]);

	useEffect(()=>{}, [
		
	])

	return (
		<>
			<div className="flex flex-col justify-between items-center">
				<div className="w-full mt-5">
					<div className="">
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
								>
									Transfer
								</Button>
							</div>
						</div>

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
					</div>
				</div>
			</div>
			<TransferTeamModal open={isOpen} closeModal={closeModal} />
		</>
	);
};
