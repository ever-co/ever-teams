'use client';

import { useModal, useOrganizationTeams } from '@app/hooks';
import { IClassName } from '@app/interfaces';
import { userState } from '@app/stores';
import { cn } from '@/lib/utils';
import { RequestToJoinModal } from '@components/layout/header/request-to-join-modal';
import Collaborate from '@components/shared/collaborate';
import { Button, Container } from 'lib/components';
import { KeyboardShortcuts } from 'lib/components/keyboard-shortcuts';
import { MinTimerFrame, TeamsDropDown, UserNavAvatar } from 'lib/features';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Skeleton from 'react-loading-skeleton';
import { useAtom } from 'jotai';

const HeaderSkeleton = () => {
	return (
		<nav className="bg-white dark:bg-dark-high w-full nav-items--shadow fixed z-[100]">
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
		<nav className={cn(className)}>
			{!notFound && (
				<div className="flex ml-auto items-center gap-10 min-h-[90px]">
					{publicTeam && (
						<Button className="py-3.5 px-4 gap-3 rounded-xl outline-none" onClick={openModal}>
							{t('common.JOIN_REQUEST')}
						</Button>
					)}
					{showTimer && <MinTimerFrame />}

					<div className="items-center hidden gap-4 md:flex">
						{!publicTeam && <Collaborate />}

						{isTeamMember && isTeamDropdownAllowed ? (
							<TeamsDropDown publicTeam={publicTeam || false} />
						) : null}

						<KeyboardShortcuts />
					</div>
					{!publicTeam && <UserNavAvatar />}
				</div>
			)}
			<RequestToJoinModal open={isOpen} closeModal={closeModal} />
		</nav>
	);
}
