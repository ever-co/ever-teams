import { useAuthenticateUser, useOrganizationTeams } from '@app/hooks';
import { IOrganizationTeamMember } from '@app/interfaces';
import { BackButton, Button, Card, Modal, Text } from 'lib/components';
import { useTranslation } from 'lib/i18n';
import { useCallback, useState } from 'react';
import { TransferTeamDropdown } from './transfer-team/transfer-team-dropdown';

/**
 * Transfer team modal
 */
export function TransferTeamModal({
	open,
	closeModal,
}: {
	open: boolean;
	closeModal: () => void;
}) {
	const { trans } = useTranslation();

	const { activeTeam, editOrganizationTeam, editOrganizationTeamLoading } =
		useOrganizationTeams();
	const { user } = useAuthenticateUser();

	const [selectedMember, setSelectedMember] =
		useState<IOrganizationTeamMember>();

	const handleSubmit = useCallback(
		(e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();

			if (activeTeam && selectedMember) {
				console.log({
					id: activeTeam.id,
					managerIds: [selectedMember.id],
					memberIds: activeTeam.members.map((member) => member.employeeId),
					tenantId: activeTeam.tenantId,
					organizationId: activeTeam.organizationId,
					name: activeTeam.name,
				});

				editOrganizationTeam({
					id: activeTeam.id,
					managerIds: [selectedMember.id],
					memberIds: activeTeam.members.map((member) => member.employeeId),
					tenantId: activeTeam.tenantId,
					organizationId: activeTeam.organizationId,
					name: activeTeam.name,
				})
					.then(closeModal)
					.catch((err) => {});
			}
		},
		[activeTeam, selectedMember]
	);

	return (
		<Modal isOpen={open} closeModal={closeModal}>
			<form
				className="w-[98%] md:w-[530px]"
				autoComplete="off"
				onSubmit={handleSubmit}
			>
				<Card className="w-full" shadow="custom">
					<div className="flex flex-col justify-between items-center">
						<Text.Heading as="h3" className="text-center">
							{trans.common.TRANSFER_TEAM}
						</Text.Heading>

						<div className="w-full mt-5">
							<TransferTeamDropdown
								setSelectedMember={setSelectedMember}
								members={activeTeam?.members
									.filter((member) => member.employee.userId !== user?.id)
									.map((member) => ({
										id: member.employeeId,
										name: member?.employee?.user?.name || '',
										title: member?.employee?.user?.name || '',
										userId: member?.employee?.userId,
									}))}
								selectedMember={selectedMember}
							/>
						</div>

						<div className="w-full flex justify-between mt-3 items-center">
							<BackButton onClick={closeModal} />

							<Button
								type="submit"
								disabled={editOrganizationTeamLoading}
								loading={editOrganizationTeamLoading}
							>
								{trans.common.TRANSFER}
							</Button>
						</div>
					</div>
				</Card>
			</form>
		</Modal>
	);
}
