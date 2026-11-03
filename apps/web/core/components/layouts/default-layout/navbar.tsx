'use client';

import { useModal } from '@/core/hooks';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { isTeamMemberState, organizationTeamsState } from '@/core/stores';
import { cn } from '@/core/lib/helpers';
import { Button } from '@/core/components';
import { usePathname } from 'next/navigation';
import { useMemo, Suspense } from 'react';
import { atom, useAtomValue } from 'jotai';
import { MinTimerSkeleton } from '@/core/components/common/skeleton/min-timer-skeleton';
import { pathCarriesItsOwnTimer } from './timer-paths';
import { useTranslations } from 'next-intl';
import { KeyboardShortcuts } from '../../common/keyboard-shortcuts';
import { ModalSkeleton } from '@/core/components/common/skeleton/modal-skeleton';
import {
	LazyMinTimerFrame,
	LazyCollaborate,
	LazyUserNavAvatar
} from '@/core/components/optimized-components/dashboard';
import { UserNavAvatarSkeleton } from '@/core/components/common/skeleton/user-nav-avatar-skeleton';
import { LazyRequestToJoinModal, LazyTeamsDropDown } from '@/core/components/optimized-components/teams';
import { CommandPaletteTrigger } from './header/command-palette-trigger';
import { TeamsDropDownSkeleton } from '@/core/components/common/skeleton/teams-dropdown-skeleton';
import { CollaborateSkeleton } from '@/core/components/common/skeleton/collaborate-skeleton';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { NotificationBell } from '@/core/components/notifications/inbox/notification-bell';

const TEAM_DROPDOWN_HIDDEN_PATHS = new Set(['/task/[id]', '/profile/[memberId]']);

const CONTROL_SKELETON = 'h-8 shrink-0 animate-pulse rounded-full bg-foreground/[0.05]';

/**
 * The controls of the top bar while the user loads, each at the size of the control it stands for (timer, inbox,
 * Collaborate, team switcher, shortcuts), so they fill in place instead of appearing one by one.
 */
function HeaderSkeleton({ showTimer }: Readonly<{ showTimer: boolean }>) {
	return (
		<div className="flex items-center gap-2" aria-hidden="true">
			{showTimer && <MinTimerSkeleton />}
			<span className={cn(CONTROL_SKELETON, 'w-8')} />
			<span className={cn(CONTROL_SKELETON, 'hidden w-[120px] md:block')} />
			<span className={cn(CONTROL_SKELETON, 'hidden w-[160px] md:block')} />
			<span className={cn(CONTROL_SKELETON, 'hidden w-8 md:block')} />
		</div>
	);
}

/** Whether the active team is known yet (its tracking setting decides whether the top bar shows the timer). */
const teamsSettledAtom = atom((get) => {
	const hasTeams = get(organizationTeamsState).length > 0;
	const hasNoTeam = !get(isTeamMemberState);
	return hasTeams || hasNoTeam;
});

/** The global controls at the end of the top bar: timer, inbox, collaborate, team switcher, shortcuts, account on phones. */
export function Navbar({
	className,
	showTimer,
	publicTeam,
	notFound
}: IClassName & {
	showTimer?: boolean;
	publicTeam?: boolean;
	notFound?: boolean;
}) {
	const t = useTranslations();
	const isTeamMember = useAtomValue(isTeamMemberState);

	const { data: user, isLoading } = useUserQuery();
	const { isOpen, closeModal, openModal } = useModal();

	const pathname = usePathname();

	const isTeamDropdownAllowed = useMemo(() => {
		if (!pathname) {
			return false;
		}
		return !TEAM_DROPDOWN_HIDDEN_PATHS.has(pathname);
	}, [pathname]);

	const isPublicTeam = publicTeam || false;
	const isNotFound = notFound || false;
	const waitsForUser = !user && !isNotFound && !isPublicTeam;
	const showSkeleton = waitsForUser || isLoading;
	const showTeamDropdown = isTeamMember && isTeamDropdownAllowed;
	const areTeamsSettled = useAtomValue(teamsSettledAtom);
	const pageCarriesItsOwnTimer = pathCarriesItsOwnTimer(pathname ?? '');
	const keepsTimerSlot = !showTimer && !areTeamsSettled && !pageCarriesItsOwnTimer;

	if (showSkeleton) {
		return <HeaderSkeleton showTimer={Boolean(showTimer)} />;
	}

	if (isNotFound) {
		return null;
	}

	return (
		<nav className={cn('flex items-center gap-2', className)}>
			{isPublicTeam && (
				<Button size="default" onClick={openModal}>
					{t('common.JOIN_REQUEST')}
				</Button>
			)}

			{showTimer && (
				<Suspense fallback={<MinTimerSkeleton />}>
					<LazyMinTimerFrame />
				</Suspense>
			)}
			{keepsTimerSlot && <MinTimerSkeleton />}

			{/* Phones only: the sidebar is a sheet there, so the palette keeps a trigger in the bar. */}
			<CommandPaletteTrigger variant="icon" className="md:hidden" />

			{!isPublicTeam && <NotificationBell />}

			<div className="hidden items-center gap-2 md:flex">
				{!isPublicTeam && (
					<Suspense fallback={<CollaborateSkeleton />}>
						<LazyCollaborate />
					</Suspense>
				)}

				{showTeamDropdown && (
					<Suspense fallback={<TeamsDropDownSkeleton />}>
						<LazyTeamsDropDown publicTeam={isPublicTeam} />
					</Suspense>
				)}

				<KeyboardShortcuts />
			</div>

			{/* Phones only: the account menu (with Collaborate, team switcher and shortcuts) stays in the bar;
			    from md up it lives at the foot of the sidebar. */}
			{!isPublicTeam && (
				<div className="md:hidden">
					<Suspense fallback={<UserNavAvatarSkeleton />}>
						<LazyUserNavAvatar />
					</Suspense>
				</div>
			)}

			{isOpen && (
				<Suspense fallback={<ModalSkeleton size="md" />}>
					<LazyRequestToJoinModal open={isOpen} closeModal={closeModal} />
				</Suspense>
			)}
		</nav>
	);
}
