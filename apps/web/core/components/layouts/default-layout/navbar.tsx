'use client';

import { useModal } from '@/core/hooks';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { isTeamMemberState } from '@/core/stores';
import { cn } from '@/core/lib/helpers';
import { Button, Container } from '@/core/components';
import { usePathname } from 'next/navigation';
import { useMemo, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import Skeleton from 'react-loading-skeleton';
import { useAtomValue } from 'jotai';
// dynamic import removed - using optimized components
import { DefaultCreateAction } from '../../features/layouts/header/create-default-action';
import { KeyboardShortcuts } from '../../common/keyboard-shortcuts';
// Lazy load RequestToJoinModal for performance optimization
import { ModalSkeleton } from '@/core/components/common/skeleton/modal-skeleton';

// Import optimized components from centralized location
import { LazyMinTimerFrame, LazyCollaborate } from '@/core/components/optimized-components/dashboard';
import { LazyRequestToJoinModal, LazyTeamsDropDown } from '@/core/components/optimized-components/teams';
import { LazySidebarCommandModal } from '@/core/components/optimized-components/common';

// Import skeletons
import { TeamsDropDownSkeleton } from '@/core/components/common/skeleton/teams-dropdown-skeleton';
import { CollaborateSkeleton } from '@/core/components/common/skeleton/collaborate-skeleton';
import { TimerSkeleton } from '@/core/components/common/skeleton/timer-skeleton';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';

const HeaderSkeleton = () => {
	return (
		<nav className="w-full bg-background">
			<Container>
				<div className="flex h-16 w-full items-center justify-between">
					<Skeleton height={32} width={120} borderRadius={6} className="dark:bg-muted" />
					<div className="flex items-center space-x-5">
						<div className="hidden sm:block">
							<Skeleton height={32} width={160} borderRadius={6} className="dark:bg-muted" />
						</div>

						<Skeleton height={32} width={180} borderRadius={6} className="dark:bg-muted" />
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
	const isTeamMember = useAtomValue(isTeamMemberState);

	const { data: user, isLoading } = useUserQuery();
	const { isOpen, closeModal, openModal } = useModal();

	const pathname = usePathname();

	const isTeamDropdownAllowed = useMemo(() => {
		if (!pathname) {
			return false;
		}
		const notAllowedList = ['/task/[id]', '/profile/[memberId]'];
		return !notAllowedList.includes(pathname);
	}, [pathname]);

	return (!user && !notFound && !publicTeam) || isLoading ? (
		<HeaderSkeleton />
	) : (
		<nav className={cn('flex gap-3 items-center', className)}>
			<DefaultCreateAction publicTeam={publicTeam} />

			{!notFound && (
				<div className="ml-auto flex items-center gap-3">
					{publicTeam && (
						<Button className="h-8 gap-2 rounded-md px-3 py-0 text-xs outline-none" onClick={openModal}>
							{t('common.JOIN_REQUEST')}
						</Button>
					)}
					{showTimer && (
						<Suspense fallback={<TimerSkeleton />}>
							<LazyMinTimerFrame />
						</Suspense>
					)}

					<div className="hidden items-center gap-2 md:flex">
						{/* The command palette trigger lives here, left of Collaborate, as Ever Works keeps
						    its search in the top bar; the palette itself is unchanged. */}
						{!publicTeam && (
							<Suspense fallback={<div className="h-8 w-52 animate-pulse rounded-md bg-muted" />}>
								<LazySidebarCommandModal publicTeam={publicTeam || false} variant="header" />
							</Suspense>
						)}
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
