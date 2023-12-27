'use client';

import { useAuthenticateUser, useModal, useOrganizationTeams, useTimer } from '@app/hooks';
import { clsxm } from '@app/utils';
import { useToast } from '@components/ui/use-toast';
import { PlusIcon } from '@heroicons/react/24/solid';
import { Button, Dropdown, Tooltip } from 'lib/components';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CreateTeamModal } from './create-team-modal';
import { TeamItem, mapTeamItems } from './team-item';
import { useTranslations } from 'next-intl';

export const TeamsDropDown = ({ publicTeam }: { publicTeam?: boolean }) => {
	const { user } = useAuthenticateUser();
	const { teams, activeTeam, setActiveTeam } = useOrganizationTeams();
	const { timerStatus, stopTimer } = useTimer();
	const t = useTranslations();
	const { toast } = useToast();

	const onChangeActiveTeam = useCallback(
		(item: TeamItem) => {
			if (item.data) {
				/**
				 * If timer started in Teams and user switches the Team, stop the timer
				 */
				if (
					timerStatus &&
					timerStatus?.running &&
					timerStatus.lastLog &&
					timerStatus.lastLog.organizationTeamId &&
					timerStatus.lastLog.source === 'TEAMS' &&
					activeTeam &&
					activeTeam?.id &&
					timerStatus.lastLog.organizationTeamId === activeTeam?.id
				) {
					toast({
						variant: 'default',
						title: t('timer.TEAM_SWITCH.STOPPED_TIMER_TOAST_TITLE'),
						description: t('timer.TEAM_SWITCH.STOPPED_TIMER_TOAST_DESCRIPTION')
					});
					stopTimer();
				}

				setActiveTeam(item.data);
			}
		},
		[setActiveTeam, timerStatus, stopTimer, activeTeam, toast, t]
	);

	const items: TeamItem[] = useMemo(() => mapTeamItems(teams, onChangeActiveTeam), [teams, onChangeActiveTeam]);

	const [teamItem, setTeamItem] = useState<TeamItem | null>(null);

	const { isOpen, closeModal, openModal } = useModal();

	useEffect(() => {
		setTeamItem(items.find((t) => t.key === activeTeam?.id) || null);
	}, [activeTeam, items]);

	return (
		<>
			<Dropdown
				className="md:w-[223px] outline-none"
				optionsClassName="md:w-[223px] outline-none"
				buttonClassName={clsxm(
					'py-0 font-medium outline-none dark:bg-[#1B1D22] dark:border-[0.125rem] border-[#0000001A] dark:border-[#26272C]',
					items.length === 0 && ['py-2']
				)}
				value={teamItem}
				onChange={onChangeActiveTeam}
				items={items}
				// loading={teamsFetching} // TODO: Enable loading in future when we implement better data fetching library like TanStack
				publicTeam={publicTeam}
			>
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
							{t('common.CREATE_TEAM')}
						</Button>
					</Tooltip>
				)}
			</Dropdown>

			{!publicTeam && <CreateTeamModal open={isOpen && !!user?.isEmailVerified} closeModal={closeModal} />}
		</>
	);
};
