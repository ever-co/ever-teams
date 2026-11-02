import { useEditOrganizationTeam } from '@/core/hooks';
import { activeTeamManagersState, activeTeamState } from '@/core/stores';
import { Button, Modal, modalFooterClass, modalPrimaryActionClass, modalSecondaryActionClass } from '@/core/components';
import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { TransferTeamDropdown } from '../../teams/transfer-team/transfer-team-dropdown';
import { IOrganizationTeamEmployee } from '@/core/types/interfaces/team/organization-team-employee';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';

/**
 * Transfer team modal
 */
export function TransferTeamModal({ open, closeModal }: { open: boolean; closeModal: () => void }) {
	const t = useTranslations();
	const activeTeamManagers = useAtomValue(activeTeamManagersState);
	const { editOrganizationTeam, editOrganizationTeamLoading } = useEditOrganizationTeam();

	const activeTeam = useAtomValue(activeTeamState);
	const { data: user } = useUserQuery();

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
					// useEditOrganizationTeam already toasts the failure; keep the modal open so the user can retry
					.catch(() => undefined);
			}
		},
		[activeTeam, selectedMember, user, activeTeamManagers, closeModal, editOrganizationTeam]
	);

	return (
		<Modal isOpen={open} closeModal={closeModal} title={t('common.TRANSFER_TEAM')} breadcrumb={activeTeam?.name}>
			<form className="flex w-full flex-col gap-5 sm:w-md" autoComplete="off" onSubmit={handleSubmit}>
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

				<div className={modalFooterClass}>
					<Button
						type="button"
						variant="ghost"
						size="default"
						className={modalSecondaryActionClass}
						onClick={closeModal}
					>
						{t('common.CANCEL')}
					</Button>
					<Button
						type="submit"
						size="default"
						className={modalPrimaryActionClass}
						disabled={editOrganizationTeamLoading}
						loading={editOrganizationTeamLoading}
					>
						{t('common.TRANSFER')}
					</Button>
				</div>
			</form>
		</Modal>
	);
}
