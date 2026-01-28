'use client';

import { Button, Dropdown } from '@/core/components';
import { useModal } from '@/core/hooks';
import { useOrganizationAndTeamManagers } from '@/core/hooks/organizations/teams/use-organization-teams-managers';
import { useProfileValidation } from '@/core/hooks/users/use-profile-validation';
import { PlusIcon } from '@heroicons/react/24/solid';
import { useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Tooltip } from '../duplicated-components/tooltip';
import { AllTeamItem, TeamItem, mapTeamItems } from './team-item';
// Import optimized components from centralized location
import { ModalSkeleton } from '@/core/components/common/skeleton/modal-skeleton';
import { LazyCreateTeamModal } from '@/core/components/optimized-components/teams';
import {
	useGetOrganizationTeamQuery,
	useGetOrganizationTeamsQuery
} from '@/core/hooks/organizations/teams/use-get-organization-teams-query';
import { useSetActiveTeam } from '@/core/hooks/organizations/teams/use-set-active-team';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useDetailedTask } from '@/core/hooks/tasks/use-detailed-task';
import { cn } from '@/core/lib/helpers';
import { timerStatusState } from '@/core/stores';
import { useAtomValue } from 'jotai';
import { usePathname, useRouter } from 'next/navigation';
import { Suspense } from 'react';

export const TeamsDropDown = ({ publicTeam }: { publicTeam?: boolean }) => {
	const { data: user } = useUserQuery();

	const { data: activeTeamResult } = useGetOrganizationTeamQuery();
	const activeTeam = useMemo(() => activeTeamResult?.data ?? null, [activeTeamResult]);

	const { data: teamsResult } = useGetOrganizationTeamsQuery();
	const teams = useMemo(() => teamsResult?.data?.items ?? [], [teamsResult]);

	const setActiveTeam = useSetActiveTeam();
	const { userManagedTeams } = useOrganizationAndTeamManagers();
	const timerStatus = useAtomValue(timerStatusState);
	const t = useTranslations();

	// Timer running status check - similar to task-input.tsx
	const timerRunningStatus = useMemo(() => {
		return Boolean(timerStatus?.running);
	}, [timerStatus]);
	const {
		detailedTaskQuery: { data: detailedTask },
		setDetailedTaskId
	} = useDetailedTask();
	const path = usePathname();
	const router = useRouter();

	// Extract memberId from current path for profile validation
	const currentMemberId = React.useMemo(() => {
		if (!path.includes('/profile/')) return null;
		const pathSegments = path.split('/');
		const profileIndex = pathSegments.findIndex((segment) => segment === 'profile');
		return profileIndex !== -1 && profileIndex + 1 < pathSegments.length ? pathSegments[profileIndex + 1] : null;
	}, [path]);

	// Use our validation hook for profile pages
	const profileValidation = useProfileValidation(currentMemberId);

	const onChangeActiveTeam = useCallback(
		(item: TeamItem) => {
			// Prevent team switching when timer is running
			if (timerRunningStatus) {
				toast.error(t('common.TEAM_SWITCH_DISABLED_MESSAGE_WHEN_TIMER_RUNNING'));
				return;
			}

			if (item.data) {
				setActiveTeam(item.data);

				if (path.split('/')[1] === 'task') {
					/**
					 * If user is on task page and switches the team,
					 *
					 * If the task is not in the new team, set the detailed task to null and redirect to home page.
					 */
					const taskBelongsToNewTeam = item.data.tasks?.some((task) => task.id === detailedTask?.id);
					if (!taskBelongsToNewTeam) {
						setDetailedTaskId(null);
						router.push('/');
					}
				}

				// Handle profile page validation using our centralized hook
				if (path.includes('/profile/')) {
					const isValidSwitch = profileValidation.validateTeamSwitch(item.data);
					if (!isValidSwitch) {
						return; // Hook handles toast and redirect
					}
				}

				// From all teams page
				if (path.includes('/all-teams')) {
					router.push('/');
				}
			}
		},
		[setActiveTeam, t, setDetailedTaskId, path, router, timerRunningStatus] // Updated dependencies for timer protection
	);

	useEffect(() => {
		if (path.includes('/all-teams')) {
			setTeamItem({
				key: 'all-teams',
				Label: () => (
					<div className="h-[42px] flex items-center">
						<AllTeamItem title={t('common.ALL_TEAMS')} count={userManagedTeams.length} />
					</div>
				)
			});
		}
	}, [path, userManagedTeams.length, t]);

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
				// Find item directly from teams instead of items to avoid circular dependency
				const foundTeam = teams.find((t) => t.id === activeTeam.id);
				if (foundTeam) {
					const foundItem = mapTeamItems([foundTeam], onChangeActiveTeam)[0];
					setTeamItem(foundItem);
				}
			} else {
				setTeamItem(null);
			}
		}
	}, [
		activeTeam?.id,
		activeTeam?.name,
		activeTeam?.color,
		activeTeam?.emoji,
		activeTeam?.teamSize,
		teams,
		onChangeActiveTeam
	]); // Removed items dependency

	return (
		<div>
			<Tooltip
				label={t('common.TEAM_SWITCH_DISABLED_MESSAGE_WHEN_TIMER_RUNNING')}
				placement="top"
				enabled={timerRunningStatus}
			>
				<Dropdown
					className={cn(
						'min-w-fit md:max-w-[223px] outline-none',
						timerRunningStatus && '!cursor-not-allowed'
					)}
					optionsClassName="min-w-fit md:max-w-[223px] outline-none"
					buttonClassName={cn(
						'py-0 font-medium outline-hidden dark:bg-[#1B1D22] dark:border-[0.125rem] border-[#0000001A] dark:border-[#26272C] cursor-pointer',
						items.length === 0 && ['py-2'],
						timerRunningStatus && '!cursor-not-allowed opacity-50'
					)}
					value={teamItem}
					onChange={onChangeActiveTeam}
					items={
						timerRunningStatus
							? []
							: [
									...items,
									...(userManagedTeams.length > 1 || path.includes('/all-teams')
										? [
												{
													key: 'all-teams',
													Label: () => (
														<AllTeamItem
															title={t('common.ALL_TEAMS')}
															count={userManagedTeams.length}
														/>
													)
												}
											]
										: [])
								]
					}
					// loading={teamsFetching} // TODO: Enable loading in future when we implement better data fetching library like TanStack
					publicTeam={publicTeam}
				>
					{!publicTeam || !timerRunningStatus ? (
						<Tooltip
							enabled={!user?.isEmailVerified || timerRunningStatus}
							label={
								timerRunningStatus
									? t('common.TEAM_SWITCH_DISABLED_MESSAGE_WHEN_TIMER_RUNNING')
									: t('common.VERIFY_ACCOUNT_MSG')
							}
							placement="top-start"
						>
							<Button
								className={`w-full text-xs mt-3 dark:text-white rounded-xl border-[0.0938rem] ${
									timerRunningStatus ? 'opacity-50 cursor-not-allowed' : ''
								}`}
								variant="outline"
								onClick={() => {
									if (timerRunningStatus) {
										toast.error(t('common.TEAM_SWITCH_DISABLED_MESSAGE_WHEN_TIMER_RUNNING'));
										return;
									}
									openModal();
								}}
								disabled={!user?.isEmailVerified || timerRunningStatus}
							>
								<PlusIcon className="w-4 h-4" />
								<span className="whitespace-nowrap text-nowrap">{t('common.CREATE_TEAM')}</span>
							</Button>
						</Tooltip>
					) : null}
				</Dropdown>
			</Tooltip>

			{!publicTeam && isOpen && !!user?.isEmailVerified && !timerRunningStatus && (
				<Suspense fallback={<ModalSkeleton size="md" />}>
					<LazyCreateTeamModal open={isOpen} closeModal={closeModal} />
				</Suspense>
			)}
		</div>
	);
};
