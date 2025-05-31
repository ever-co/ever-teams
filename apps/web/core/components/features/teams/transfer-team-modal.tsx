import { useAuthenticateUser, useOrganizationTeams } from '@/core/hooks';
import { activeTeamManagersState } from '@/core/stores';
import { BackButton, Button, Modal, Text } from '@/core/components';
import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { EverCard } from '../../common/ever-card';
import { TransferTeamDropdown } from '../../teams/transfer-team/transfer-team-dropdown';
import { IOrganizationTeamEmployee } from '@/core/types/interfaces/team/organization-team-employee';

/**
 * Transfer team modal
 */
export function TransferTeamModal({ open, closeModal }: { open: boolean; closeModal: () => void }) {
	const t = useTranslations();
	const activeTeamManagers = useAtomValue(activeTeamManagersState);
	const { activeTeam, editOrganizationTeam, editOrganizationTeamLoading } = useOrganizationTeams();
	const { user } = useAuthenticateUser();

	const [selectedMember, setSelectedMember] = useState<IOrganizationTeamEmployee>();

	const handleSubmit = useCallback(
		(e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();

			if (activeTeam && selectedMember) {
				editOrganizationTeam({
					id: activeTeam.id,
					managerIds: [
						...activeTeamManagers
							.filter((manager) => manager.employee?.userId !== user?.id)
							.map((manager) => manager.employeeId || ''),
						selectedMember.id || ''
					],
					memberIds: activeTeam.members?.map((member) => member.employeeId || ''),
					tenantId: activeTeam.tenantId,
					organizationId: activeTeam.organizationId,
					name: activeTeam.name
				})
					.then(closeModal)
					.catch(closeModal);
			}
		},
		[activeTeam, selectedMember, user, activeTeamManagers, closeModal, editOrganizationTeam]
	);

	return (
		<Modal isOpen={open} closeModal={closeModal}>
			<form className="w-[98%] md:w-[530px]" autoComplete="off" onSubmit={handleSubmit}>
				<EverCard className="w-full" shadow="custom">
					<div className="flex flex-col items-center justify-between">
						<Text.Heading as="h3" className="text-center">
							{t('common.TRANSFER_TEAM')}
						</Text.Heading>

						<div className="w-full mt-5">
							<TransferTeamDropdown
								setSelectedMember={setSelectedMember}
								members={activeTeam?.members
									?.filter((member) => member.employee?.userId !== user?.id)
									?.map((member) => ({
										id: member.employeeId,
										name: member.employee?.user?.name || '',
										title: member.employee?.user?.name || '',
										userId: member.employee?.userId
									}))}
								selectedMember={selectedMember}
							/>
						</div>

						<div className="flex items-center justify-between w-full mt-3">
							<BackButton onClick={closeModal} />

							<Button
								type="submit"
								disabled={editOrganizationTeamLoading}
								loading={editOrganizationTeamLoading}
							>
								{t('common.TRANSFER')}
							</Button>
						</div>
					</div>
				</EverCard>
			</form>
		</Modal>
	);
}
