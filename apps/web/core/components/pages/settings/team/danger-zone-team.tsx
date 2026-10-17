/* eslint-disable no-mixed-spaces-and-tabs */
import { useIsMemberManager, useModal, useOrganizationEmployeeTeams, useDeleteOrganizationTeam } from '@/core/hooks';
import { activeTeamManagersState, activeTeamState } from '@/core/stores';
import { Button, Text } from '@/core/components';
import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { LAST_WORKSPACE_AND_TEAM } from '@/core/constants/config/constants';
import { RemoveModal } from '@/core/components/settings/remove-modal';
import { TransferTeamModal } from '@/core/components/features/teams/transfer-team-modal';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';

// Danger-zone row: title + description on the left, an outline danger action on the right.
const DANGER_ROW =
	'flex flex-col gap-3 border-t border-border py-4 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between';
const DANGER_TITLE = 'text-sm font-medium text-foreground';
const DANGER_DESCRIPTION = 'mt-0.5 text-xs text-muted-foreground';
const DANGER_BUTTON =
	'h-9 shrink-0 whitespace-nowrap rounded-md border-destructive/40 bg-transparent px-3 py-0 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:hover:bg-transparent';

export const DangerZoneTeam = () => {
	const t = useTranslations();
	const { isOpen, closeModal, openModal } = useModal();
	const { isOpen: dangerIsOpen, closeModal: dangerCloseModal, openModal: dangerOpenaModal } = useModal();
	const [removeModalType, setRemoveModalType] = useState<'DISPOSE' | 'QUIT' | null>(null);

	const activeTeam = useAtomValue(activeTeamState);
	const { deleteOrganizationTeam, deleteOrganizationTeamLoading } = useDeleteOrganizationTeam();
	const { deleteOrganizationTeamEmployee, deleteOrganizationEmployeeTeamLoading } = useOrganizationEmployeeTeams();
	const { data: user } = useUserQuery();

	const { isTeamManager } = useIsMemberManager(user);
	const activeTeamManagers = useAtomValue(activeTeamManagersState);

	const handleDisposeTeam = useCallback(() => {
		if (activeTeam) {
			window.localStorage.removeItem(LAST_WORKSPACE_AND_TEAM);
			return deleteOrganizationTeam(activeTeam.id);
		}
	}, [activeTeam, deleteOrganizationTeam]);

	const handleQuiteTeam = useCallback(() => {
		if (activeTeam && user) {
			const currentEmployeeDetails = activeTeam.members?.find(
				(member) => member.employeeId === user.employee?.id
			);

			if (currentEmployeeDetails && currentEmployeeDetails.id) {
				// Remove from Team API call
				return deleteOrganizationTeamEmployee({
					id: currentEmployeeDetails.id,
					employeeId: currentEmployeeDetails.employeeId || ''
				});
			}
		}
		return;
	}, [activeTeam, user, deleteOrganizationTeamEmployee]);

	return (
		<>
			<div className="flex w-full flex-col">
				{/* Current User is the Manager of the Team and there are more that 1 Managers */}
				<div className={DANGER_ROW}>
					<div className="min-w-0">
						<Text className={DANGER_TITLE}>{t('common.TRANSFERT_OWNERSHIP')}</Text>
						<Text className={DANGER_DESCRIPTION}>{t('common.TRANSFERT_OWNERSHIP_TO')}</Text>
					</div>
					<Button
						variant="outline-danger"
						type="submit"
						className={DANGER_BUTTON}
						onClick={openModal}
						disabled={!(isTeamManager && activeTeamManagers.length >= 2)}
					>
						{t('common.TRANSFER')}
					</Button>
				</div>

				{/* Current User is the Only Manager of the Team*/}
				<div className={DANGER_ROW}>
					<div className="min-w-0">
						<Text className={DANGER_TITLE}>{t('common.REMOVE_TEAM')}</Text>
						<Text className={DANGER_DESCRIPTION}>{t('alerts.ALERT_REMOVE_TEAM')}</Text>
					</div>
					<Button
						variant="outline-danger"
						type="submit"
						className={DANGER_BUTTON}
						onClick={() => {
							setRemoveModalType('DISPOSE');
							dangerOpenaModal();
						}}
						disabled={!(isTeamManager && activeTeamManagers.length === 1)}
					>
						{t('common.DISPOSE_TEAM')}
					</Button>
				</div>

				<div className={DANGER_ROW}>
					<div className="min-w-0">
						<Text className={DANGER_TITLE}>{t('common.QUIT_TEAM')}</Text>
						<Text className={DANGER_DESCRIPTION}>{t('alerts.ALERT_QUIT_TEAM')}</Text>
					</div>
					<Button
						variant="outline-danger"
						type="submit"
						className={DANGER_BUTTON}
						onClick={() => {
							setRemoveModalType('QUIT');
							dangerOpenaModal();
						}}
						disabled={
							!(
								(isTeamManager && activeTeamManagers.length > 1) ||
								(!isTeamManager &&
									activeTeam?.members?.some((member) => member.employee?.userId === user?.id))
							)
						}
					>
						{t('common.QUIT')}
					</Button>
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
