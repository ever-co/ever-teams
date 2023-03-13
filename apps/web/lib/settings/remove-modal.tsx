import { useCallback } from 'react';
import { useUser, useAuthenticateUser, useOrganizationTeams } from '@app/hooks';
import { useOrganizationEmployeeTeams } from '@app/hooks/features/useOrganizatioTeamsEmployee';
import { Button, Text, Modal, Card } from 'lib/components';
import { useTranslation } from 'lib/i18n';

export const RemoveModal = ({
	open,
	close,
	title,
	onDelete,
	personal,
	onDispose,
	team,
}: {
	open: boolean;
	close: () => void;
	title: string;
	onDelete?: boolean;
	onDispose?: boolean;
	personal?: boolean;
	team?: boolean;
}) => {
	const { user } = useAuthenticateUser();
	const { deleteUser, deleteUserLoading } = useUser();
	const {
		removeUserFromAllTeam,
		removeUserFromAllTeamLoading,
		activeTeam,
		deleteOrganizationTeam,
	} = useOrganizationTeams();
	const { trans } = useTranslation();
	const { deleteOrganizationTeamEmployee } = useOrganizationEmployeeTeams();

	const handleRemoveUser = useCallback(() => {
		if (user) {
			removeUserFromAllTeam(user.id);
		}
	}, [user, removeUserFromAllTeam]);

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
			<Modal isOpen={open} closeModal={close}>
				<Card className="w-full" shadow="custom">
					<div className="flex flex-col justify-between items-center">
						<Text.Heading as="h3" className="text-center gap-32 text-2xl">
							{title}
						</Text.Heading>
						<div className="w-full flex justify-between mt-10 items-center">
							<Button
								type="button"
								onClick={close}
								disabled={false}
								loading={false}
								className={
									'bg-transparent text-primary dark:text-dark--theme font-medium border border-gray-300 dark:border-0 dark:bg-light--theme-dark rounded-md md:min-w-[180px]'
								}
							>
								{trans.common.DISCARD}
							</Button>

							{personal ? (
								<Button
									variant="danger"
									type="submit"
									className="font-medium rounded-md bg-[#EB6961] md:min-w-[180px]"
									disabled={removeUserFromAllTeamLoading}
									loading={removeUserFromAllTeamLoading}
									onClick={() => {
										handleRemoveUser();
									}}
								>
									{trans.common.CONFIRM}
								</Button>
							) : onDelete ? (
								<Button
									type="button"
									disabled={deleteUserLoading}
									loading={deleteUserLoading}
									className="font-medium rounded-md bg-[#EB6961] md:min-w-[180px]"
									onClick={() => {
										deleteUser();
									}}
								>
									{trans.common.CONFIRM}
								</Button>
							) : (
								''
							)}

							{team ? (
								<Button
									variant="danger"
									type="submit"
									className="font-medium rounded-md bg-[#EB6961] md:min-w-[160px]"
									onClick={() => {
										handleQuiteTeam();
									}}
								>
									{trans.common.CONFIRM}
								</Button>
							) : onDispose ? (
								<Button
									variant="danger"
									type="submit"
									className="font-medium rounded-md bg-[#EB6961] md:min-w-[180px]"
									onClick={() => {
										handleDisposeTeam();
									}}
								>
									{trans.common.CONFIRM}
								</Button>
							) : (
								''
							)}
						</div>
					</div>
				</Card>
			</Modal>
		</>
	);
};
