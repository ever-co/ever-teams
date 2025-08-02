'use client';

import { useAuthenticateUser, useModal, useOrganizationTeams, useTimer } from '@/core/hooks';
import { clsxm } from '@/core/lib/utils';
import { PlusIcon } from '@heroicons/react/24/solid';
import { Button, Dropdown } from '@/core/components';
import { useCallback, useMemo, useState } from 'react';
import { AllTeamItem, TeamItem, mapTeamItems } from './team-item';
import { useTranslations } from 'next-intl';
import { useOrganizationAndTeamManagers } from '@/core/hooks/organizations/teams/use-organization-teams-managers';
import React from 'react';
import { Tooltip } from '../duplicated-components/tooltip';
import { toast } from 'sonner';
// Import optimized components from centralized location
import { LazyCreateTeamModal } from '@/core/components/optimized-components/teams';
import { Suspense } from 'react';
import { ModalSkeleton } from '@/core/components/common/skeleton/modal-skeleton';

export const TeamsDropDown = ({ publicTeam }: { publicTeam?: boolean }) => {
	const { user } = useAuthenticateUser();
	const { teams, activeTeam, setActiveTeam } = useOrganizationTeams();
	const { userManagedTeams } = useOrganizationAndTeamManagers();
	const { timerStatus, stopTimer } = useTimer();
	const t = useTranslations();

	const onChangeActiveTeam = useCallback(
		(item: TeamItem) => {
			if (item.data) {
				/**
				 * If timer started in Teams and user switches the Team, stop the timer
				 */
				if (
					timerStatus &&
					timerStatus?.running &&
					timerStatus?.lastLog &&
					timerStatus?.lastLog?.organizationTeamId &&
					timerStatus?.lastLog?.source === 'TEAMS' &&
					activeTeam &&
					activeTeam?.id &&
					timerStatus?.lastLog?.organizationTeamId === activeTeam?.id
				) {
					toast.success(t('timer.TEAM_SWITCH.STOPPED_TIMER_TOAST_TITLE'), {
						description: t('timer.TEAM_SWITCH.STOPPED_TIMER_TOAST_DESCRIPTION')
					});
					stopTimer();
				}

				setActiveTeam(item.data);
			}
		},
		[setActiveTeam, stopTimer, t] // Removed timerStatus and activeTeam to prevent constant recreation
	);

	// Create items from teams - keep it simple to avoid circular dependencies
	const items: TeamItem[] = useMemo(() => mapTeamItems(teams, onChangeActiveTeam), [teams, onChangeActiveTeam]);

	const [teamItem, setTeamItem] = useState<TeamItem | null>(null);

	const { isOpen, closeModal, openModal } = useModal();

	// Update teamItem when activeTeam changes - use a ref to track previous values to avoid loops
	const prevActiveTeamRef = React.useRef<string>('');

	React.useEffect(() => {
		const currentTeamKey = `${activeTeam?.id}-${activeTeam?.name}-${activeTeam?.color}-${activeTeam?.emoji}-${activeTeam?.teamSize}`;

		if (currentTeamKey !== prevActiveTeamRef.current) {
			prevActiveTeamRef.current = currentTeamKey;

			if (activeTeam?.id) {
				const foundItem = items.find((t) => t.key === activeTeam.id);
				if (foundItem) {
					setTeamItem(foundItem);
				}
			} else {
				setTeamItem(null);
			}
		}
	}, [activeTeam?.id, activeTeam?.name, activeTeam?.color, activeTeam?.emoji, activeTeam?.teamSize, items]);

	return (
		<div>
			<Dropdown
				className="min-w-fit md:max-w-[223px] outline-none"
				optionsClassName="min-w-fit md:max-w-[223px] outline-none"
				buttonClassName={clsxm(
					'py-0 font-medium outline-none dark:bg-[#1B1D22] dark:border-[0.125rem] border-[#0000001A] dark:border-[#26272C] cursor-pointer',
					items.length === 0 && ['py-2']
				)}
				value={teamItem}
				onChange={onChangeActiveTeam}
				items={items}
				// loading={teamsFetching} // TODO: Enable loading in future when we implement better data fetching library like TanStack
				publicTeam={publicTeam}
			>
				{userManagedTeams.length > 1 && (
					<AllTeamItem title={t('common.ALL_TEAMS')} count={userManagedTeams.length} />
				)}

				{!publicTeam && (
					<Tooltip
						enabled={!user?.isEmailVerified}
						label={t('common.VERIFY_ACCOUNT_MSG')}
						placement="top-start"
					>
						<Button
							className="w-full text-xs mt-3 dark:text-white rounded-xl border-[0.0938rem]"
							variant="outline"
							onClick={openModal}
							disabled={!user?.isEmailVerified}
						>
							<PlusIcon className="w-4 h-4" />
							<span className="whitespace-nowrap text-nowrap">{t('common.CREATE_TEAM')}</span>
						</Button>
					</Tooltip>
				)}
			</Dropdown>

			{!publicTeam && isOpen && !!user?.isEmailVerified && (
				<Suspense fallback={<ModalSkeleton size="md" />}>
					<LazyCreateTeamModal open={isOpen} closeModal={closeModal} />
				</Suspense>
			)}
		</div>
	);
};
