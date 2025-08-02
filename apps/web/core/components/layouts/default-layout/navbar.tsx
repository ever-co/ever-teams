'use client';

import { useModal, useOrganizationTeams } from '@/core/hooks';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { userState } from '@/core/stores';
import { cn } from '@/core/lib/helpers';
import { Button, Container } from '@/core/components';
import { usePathname } from 'next/navigation';
import { useMemo, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import Skeleton from 'react-loading-skeleton';
import { useAtom } from 'jotai';
// dynamic import removed - using optimized components
import { DefaultCreateAction } from '../../features/layouts/header/create-default-action';
import { KeyboardShortcuts } from '../../common/keyboard-shortcuts';
// Lazy load RequestToJoinModal for performance optimization
import { ModalSkeleton } from '@/core/components/common/skeleton/modal-skeleton';

// Import optimized components from centralized location
import {
	LazyMinTimerFrame,
	LazyCollaborate,
	LazyUserNavAvatar
} from '@/core/components/optimized-components/dashboard';
import { LazyRequestToJoinModal, LazyTeamsDropDown } from '@/core/components/optimized-components/teams';

// Import skeletons
import { TeamsDropDownSkeleton } from '@/core/components/common/skeleton/teams-dropdown-skeleton';
import { CollaborateSkeleton } from '@/core/components/common/skeleton/collaborate-skeleton';
import { UserNavAvatarSkeleton } from '@/core/components/common/skeleton/user-nav-avatar-skeleton';
import { TimerSkeleton } from '@/core/components/common/skeleton/timer-skeleton';

const HeaderSkeleton = () => {
	return (
		<nav className="bg-white dark:bg-dark-high w-full nav-items--shadow fixed z-[999]">
			<Container>
				<div className="w-full flex justify-between items-center min-h-[70px]">
					<Skeleton height={45} width={200} borderRadius={20} className="dark:bg-[#272930]" />
					<div className="flex items-center space-x-5">
						<div className="hidden sm:block">
							<Skeleton height={45} width={175} borderRadius={20} className="dark:bg-[#272930]" />
						</div>

						<Skeleton circle={true} height={45} width={45} className="dark:bg-[#272930]" />
					</div>
				</div>
			</Container>
		</nav>
	);
};

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
	const { isTeamMember } = useOrganizationTeams();
	const [user] = useAtom(userState);
	const { isOpen, closeModal, openModal } = useModal();

	const pathname = usePathname();

	const isTeamDropdownAllowed = useMemo(() => {
		if (!pathname) {
			return false;
		}
		const notAllowedList = ['/task/[id]', '/profile/[memberId]'];
		return !notAllowedList.includes(pathname);
	}, [pathname]);

	return !user && !notFound && !publicTeam ? (
		<HeaderSkeleton />
	) : (
		<nav className={cn('flex gap-3 items-center', className)}>
			<DefaultCreateAction publicTeam={publicTeam} />

			{!notFound && (
				<div className="flex ml-auto items-center gap-8 min-h-[90px]">
					{publicTeam && (
						<Button className="py-3.5 px-4 gap-3 rounded-xl outline-none" onClick={openModal}>
							{t('common.JOIN_REQUEST')}
						</Button>
					)}
					{showTimer && (
						<Suspense fallback={<TimerSkeleton />}>
							<LazyMinTimerFrame />
						</Suspense>
					)}

					<div className="items-center hidden gap-3.5 md:flex">
						{!publicTeam && (
							<Suspense fallback={<CollaborateSkeleton />}>
								<LazyCollaborate />
							</Suspense>
						)}

						{isTeamMember && isTeamDropdownAllowed ? (
							<Suspense fallback={<TeamsDropDownSkeleton />}>
								<LazyTeamsDropDown publicTeam={publicTeam || false} />
							</Suspense>
						) : null}

						<KeyboardShortcuts />
					</div>
					{!publicTeam && (
						<Suspense fallback={<UserNavAvatarSkeleton />}>
							<LazyUserNavAvatar />
						</Suspense>
					)}
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
