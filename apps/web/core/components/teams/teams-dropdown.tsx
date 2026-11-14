'use client';

import { useModal, useCreateOrganizationTeam } from '@/core/hooks';
import { useProfileValidation } from '@/core/hooks/users/use-profile-validation';
import { ChevronsUpDown, Plus, Settings, Timer, UsersGroup } from '@/core/components/icons';
import { type MouseEvent, useCallback, useMemo, useState } from 'react';
import { TeamItem } from './team-item';
import { useTranslations } from 'next-intl';
import { useOrganizationAndTeamManagers } from '@/core/hooks/organizations/teams/use-organization-teams-managers';
import React from 'react';
import { Tooltip } from '../duplicated-components/tooltip';
import { toast } from 'sonner';
// Import optimized components from centralized location
import { LazyCreateTeamModal } from '@/core/components/optimized-components/teams';
import { Suspense } from 'react';
import { ModalSkeleton } from '@/core/components/common/skeleton/modal-skeleton';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import {
	activeTeamState,
	detailedTaskState,
	localTimerStatusState,
	organizationTeamsState,
	timerStartingState,
	timerStatusState
} from '@/core/stores';
import { useAtomValue, useAtom } from 'jotai';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/core/lib/helpers';
import Link from 'next/link';
import { EntityTile } from '@/core/components/common/entity-tile';
import { Skeleton } from '@/core/components/common/skeleton';
import { commandKeycapClass } from '@/core/components/common/command';
import { SelectedMark } from '@/core/components/common/selected-mark';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { TOrganizationTeam } from '@/core/types/schemas';
import { useActiveTeamSnapshot } from '@/core/hooks/organizations/teams/use-active-team-snapshot';
import { useTeamMenuOrganizations } from '@/core/hooks/organizations/teams/use-team-menu-organizations';
import { useSwitchOrganization } from '@/core/hooks/organizations/teams/use-switch-organization';
import { teamsOutsideOtherOrganizations, type ITeamMenuOrganization } from '@/core/lib/utils/team-menu-organizations';
import { TeamMenuOrganizations, teamImageOf } from './team-menu-organizations';

const TEAM_SWITCH_BLOCKED_TOAST_ID = 'team-switch-blocked-timer-running';
const CREATE_BLOCKED_TOAST_ID = 'create-blocked-timer-running';
const ORGANIZATION_SWITCH_FAILED_TOAST_ID = 'organization-switch-failed';

export const TeamsDropDown = ({ publicTeam }: { publicTeam?: boolean }) => {
	const { data: user } = useUserQuery();

	const activeTeam = useAtomValue(activeTeamState);
	const teams = useAtomValue(organizationTeamsState);

	const { setActiveTeam } = useCreateOrganizationTeam();
	const { userManagedTeams } = useOrganizationAndTeamManagers();
	const timerStatus = useAtomValue(timerStatusState);
	// This tab's own status says running as soon as Start is pressed, before the server's status does
	const localTimerStatus = useAtomValue(localTimerStatusState);
	const t = useTranslations();

	// Timer running status check - similar to task-input.tsx
	const timerRunningStatus = useMemo(() => {
		return Boolean(timerStatus?.running) || Boolean(localTimerStatus?.running);
	}, [localTimerStatus, timerStatus]);
	const [detailedTask, setDetailedTask] = useAtom(detailedTaskState);
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
				toast.warning(t('common.TEAM_SWITCH_DISABLED_MESSAGE_WHEN_TIMER_RUNNING'), {
					id: TEAM_SWITCH_BLOCKED_TOAST_ID
				});
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
						setDetailedTask(null);
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
		[setActiveTeam, t, setDetailedTask, path, router, timerRunningStatus, detailedTask?.id, profileValidation]
	);

	const { isOpen, closeModal, openModal } = useModal();
	const [menuOpen, setMenuOpen] = useState(false);

	const isAllTeamsPage = path.includes('/all-teams');
	const hasActiveTeam = Boolean(activeTeam?.id);
	const showsActiveTeam = !isAllTeamsPage && hasActiveTeam;
	const activeTeamSnapshot = useActiveTeamSnapshot(activeTeam, teamImageOf(activeTeam));
	const isTeamUnknown = !isAllTeamsPage && !hasActiveTeam;
	const showsSnapshot = isTeamUnknown && Boolean(activeTeamSnapshot);
	const showsTeamSkeleton = isTeamUnknown && !activeTeamSnapshot;
	const managesSeveralTeams = userManagedTeams.length > 1;
	const showsAllTeams = managesSeveralTeams || isAllTeamsPage;
	const orderedTeams = useMemo(() => activeTeamFirst(teams, activeTeam?.id), [teams, activeTeam?.id]);
	// A start sent but not answered yet: the status still says stopped, and a switch would leave that timer behind
	const isTimerStarting = useAtomValue(timerStartingState);

	// The person's other organizations of the workspace, read once the session is known so the menu opens on them
	const menuOrganizations = useTeamMenuOrganizations();
	const switchOrganization = useSwitchOrganization();
	const [failedOrganizationId, setFailedOrganizationId] = useState<string | null>(null);
	const otherOrganizations = useMemo(() => menuOrganizations.data?.others ?? [], [menuOrganizations.data?.others]);
	const currentOrganizationName = menuOrganizations.data?.current?.name;
	const hasOtherOrganizations = otherOrganizations.length > 0;
	const labelsCurrentOrganization = hasOtherOrganizations && Boolean(currentOrganizationName);
	const switchingOrganizationId = organizationBeingOpened(switchOrganization);
	const isSwitchingOrganization = switchingOrganizationId !== null;
	const blocksTeamChange = timerRunningStatus || isSwitchingOrganization;
	const blocksOrganizationSwitch = blocksTeamChange || isTimerStarting;
	const cannotCreateTeam = !user?.isEmailVerified || blocksTeamChange;

	const selectTeam = useCallback(
		(team: TOrganizationTeam) => {
			// Another organization is opening: a team picked here would undo the switch's team and organization
			if (isSwitchingOrganization) {
				return;
			}
			onChangeActiveTeam({ key: team.id, data: team } as TeamItem);
		},
		[isSwitchingOrganization, onChangeActiveTeam]
	);

	const openTeamSettings = useCallback(
		(event: MouseEvent<HTMLAnchorElement>, team: TOrganizationTeam) => {
			event.stopPropagation();
			if (isSwitchingOrganization) {
				event.preventDefault();
				return;
			}
			selectTeam(team);
			setMenuOpen(false);
		},
		[isSwitchingOrganization, selectTeam]
	);

	const teamsOfThisOrganization = useMemo(
		() => teamsOutsideOtherOrganizations(orderedTeams, otherOrganizations),
		[orderedTeams, otherOrganizations]
	);

	const openOtherOrganization = useCallback(
		(organization: ITeamMenuOrganization, team?: TOrganizationTeam) => {
			const isTimerOn = timerRunningStatus || isTimerStarting;
			if (isTimerOn) {
				toast.warning(t('common.TEAM_SWITCH_DISABLED_MESSAGE_WHEN_TIMER_RUNNING'), {
					id: TEAM_SWITCH_BLOCKED_TOAST_ID
				});
				return;
			}
			if (isSwitchingOrganization) {
				return;
			}
			setFailedOrganizationId(null);
			switchOrganization.mutate(
				{ organizationId: organization.id, team },
				{
					onError: () => {
						setFailedOrganizationId(organization.id);
						toast.error(t('switchers.ORGANIZATION_SWITCH_FAILED'), {
							id: ORGANIZATION_SWITCH_FAILED_TOAST_ID
						});
					}
				}
			);
		},
		[isSwitchingOrganization, isTimerStarting, switchOrganization, t, timerRunningStatus]
	);

	const startTeamCreation = useCallback(() => {
		if (timerRunningStatus) {
			toast.warning(t('common.CREATE_DISABLED_MESSAGE_WHEN_TIMER_RUNNING'), { id: CREATE_BLOCKED_TOAST_ID });
			return;
		}
		// Another organization is opening: a team created here would become the active one over the switch's
		if (isSwitchingOrganization) {
			return;
		}
		openModal();
	}, [isSwitchingOrganization, timerRunningStatus, t, openModal]);

	return (
		<div>
			<Tooltip
				label={t('common.TEAM_SWITCH_DISABLED_MESSAGE_WHEN_TIMER_RUNNING')}
				placement="top"
				enabled={timerRunningStatus}
			>
				<DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
					<DropdownMenuTrigger asChild disabled={publicTeam}>
						<button type="button" className={cn(TEAM_TRIGGER, timerRunningStatus && 'opacity-60')}>
							{isAllTeamsPage && (
								<TeamTriggerContent title={t('common.ALL_TEAMS')} count={userManagedTeams.length} />
							)}
							{showsActiveTeam && (
								<TeamTriggerContent
									title={activeTeam?.name}
									count={activeTeam?.members?.length}
									color={activeTeam?.color}
									imageUrl={teamImageOf(activeTeam)}
								/>
							)}
							{showsSnapshot && activeTeamSnapshot && (
								<TeamTriggerContent
									title={activeTeamSnapshot.name}
									count={activeTeamSnapshot.memberCount}
									color={activeTeamSnapshot.color}
									imageUrl={activeTeamSnapshot.imageUrl ?? undefined}
								/>
							)}
							{showsTeamSkeleton && <TeamTriggerSkeleton />}
							<ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
						</button>
					</DropdownMenuTrigger>

					<DropdownMenuContent align="end" sideOffset={6} className="w-72">
						{labelsCurrentOrganization && (
							<DropdownMenuLabel className="truncate" title={currentOrganizationName}>
								{currentOrganizationName}
							</DropdownMenuLabel>
						)}
						{!labelsCurrentOrganization && <DropdownMenuLabel>{t('common.TEAMS')}</DropdownMenuLabel>}

						{timerRunningStatus && (
							<div className="mx-1 mb-1 flex items-start gap-2 rounded-md bg-warning/10 px-2 py-1.5 text-xs text-warning-foreground">
								<Timer className="mt-px size-3.5 shrink-0" aria-hidden="true" />
								<span>{t('common.TEAM_SWITCH_DISABLED_MESSAGE_WHEN_TIMER_RUNNING')}</span>
							</div>
						)}

						{teamsOfThisOrganization.map((team) => {
							const isActiveTeam = team.id === activeTeam?.id;
							return (
								<DropdownMenuItem
									key={team.id}
									disabled={blocksTeamChange}
									onClick={() => selectTeam(team)}
									className="group/team h-9 gap-2.5"
								>
									<EntityTile name={team.name} color={team.color} imageUrl={teamImageOf(team)} />
									<span className="min-w-0 flex-1 truncate" title={team.name}>
										{team.name}
									</span>
									<span className={COUNT_KEYCAP}>{team.members?.length ?? 0}</span>
									<span className="flex size-4 shrink-0 items-center justify-center">
										{isActiveTeam && <SelectedMark />}
									</span>
									<Link
										href="/settings/team"
										aria-label={t('switchers.TEAM_SETTINGS')}
										onClick={(event) => openTeamSettings(event, team)}
										className={TEAM_SETTINGS_BUTTON}
									>
										<Settings className="size-3.5" />
									</Link>
								</DropdownMenuItem>
							);
						})}

						<TeamMenuOrganizations
							organizations={otherOrganizations}
							isLoading={menuOrganizations.isLoading}
							isError={menuOrganizations.isError}
							onRetry={() => void menuOrganizations.refetch()}
							isDisabled={blocksOrganizationSwitch}
							switchingOrganizationId={switchingOrganizationId}
							failedOrganizationId={failedOrganizationId}
							onPickTeam={openOtherOrganization}
							onPickOrganization={(organization) => openOtherOrganization(organization)}
							countClassName={COUNT_KEYCAP}
						/>

						<DropdownMenuSeparator />

						{showsAllTeams && (
							<DropdownMenuItem asChild className="h-8">
								<Link href="/all-teams">
									<UsersGroup />
									<span className="flex-1">{t('common.ALL_TEAMS')}</span>
									<span className={COUNT_KEYCAP}>{userManagedTeams.length}</span>
								</Link>
							</DropdownMenuItem>
						)}

						{!publicTeam && (
							<Tooltip
								enabled={!user?.isEmailVerified}
								label={t('common.VERIFY_ACCOUNT_MSG')}
								placement="left"
							>
								<DropdownMenuItem
									disabled={cannotCreateTeam}
									onClick={startTeamCreation}
									className="h-8"
								>
									<Plus />
									<span>{t('common.CREATE_TEAM')}</span>
								</DropdownMenuItem>
							</Tooltip>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			</Tooltip>

			{!publicTeam && isOpen && !!user?.isEmailVerified && !timerRunningStatus && (
				<Suspense fallback={<ModalSkeleton size="md" />}>
					<LazyCreateTeamModal open={isOpen} closeModal={closeModal} />
				</Suspense>
			)}
		</div>
	);
};

const TEAM_TRIGGER =
	'inline-flex h-8 max-w-64 items-center gap-2 rounded-full bg-card pl-1.5 pr-2.5 text-[13px] font-medium text-foreground outline-none hairline-ring ring-border shadow-[0_1px_1px_rgb(0_0_0/0.04)] transition-colors hover:bg-foreground/[0.03] focus-visible:ring-[3px] focus-visible:ring-ring/25 data-[state=open]:bg-foreground/[0.04] disabled:cursor-default';

const COUNT_KEYCAP = cn(commandKeycapClass, 'tabular-nums');

const TEAM_SETTINGS_BUTTON =
	'flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/70 outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25';

/**
 * The organization a switch under way is opening, or null when none runs. A switch that succeeded is still under way:
 * the page is being replaced.
 */
function organizationBeingOpened(switching: ReturnType<typeof useSwitchOrganization>): string | null {
	const isUnderWay = switching.isPending || switching.isSuccess;
	if (!isUnderWay) {
		return null;
	}
	return switching.variables?.organizationId ?? null;
}

function activeTeamFirst(teams: TOrganizationTeam[], activeTeamId: string | undefined) {
	const namedTeams = teams.filter((team) => team.id && team.name);
	const activeTeam = namedTeams.find((team) => team.id === activeTeamId);
	const otherTeams = namedTeams.filter((team) => team.id !== activeTeamId);
	if (!activeTeam) {
		return otherTeams;
	}
	return [activeTeam, ...otherTeams];
}

function TeamTriggerContent({
	title,
	count,
	color,
	imageUrl
}: Readonly<{
	title?: string;
	count?: number;
	color?: string | null;
	imageUrl?: string;
}>) {
	return (
		<>
			<EntityTile name={title} color={color} imageUrl={imageUrl} className="size-5" />
			<span className="min-w-0 truncate">{title}</span>
			<span className={COUNT_KEYCAP}>{count ?? 0}</span>
		</>
	);
}

/** Holds the trigger's place while the active team is not known yet, instead of an empty tile and a zero. */
function TeamTriggerSkeleton() {
	return (
		<>
			<Skeleton className="size-5 rounded-[28%] bg-foreground/[0.06]" />
			<Skeleton className="h-3.5 w-20 bg-foreground/[0.06]" />
		</>
	);
}
