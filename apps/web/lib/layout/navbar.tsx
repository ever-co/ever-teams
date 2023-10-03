import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Button, Container } from 'lib/components';
import { EverTeamsLogo } from 'lib/components/svgs';
import { MinTimerFrame, TeamsDropDown, UserNavAvatar } from 'lib/features';
import Skeleton from 'react-loading-skeleton';
import { useOrganizationTeams, useModal } from '@app/hooks';
import { useRecoilState } from 'recoil';
import { userState } from '@app/stores';
import { RequestToJoinModal } from '@components/layout/header/request-to-join-modal';
import { useTranslation } from 'lib/i18n';
import { useRouter } from 'next/router';
import { useMemo } from 'react';
import Collaborate from '@components/shared/collaborate';

const HeaderSkeleton = () => {
	return (
		<nav className="bg-white dark:bg-dark-high w-full nav-items--shadow fixed z-[999]">
			<Container>
				<div className="w-full flex justify-between items-center min-h-[70px]">
					<Skeleton
						height={45}
						width={200}
						borderRadius={20}
						className="dark:bg-[#272930]"
					/>
					<div className="flex space-x-5 items-center">
						<div className="hidden sm:block">
							<Skeleton
								height={45}
								width={175}
								borderRadius={20}
								className="dark:bg-[#272930]"
							/>
						</div>

						<Skeleton
							circle={true}
							height={45}
							width={45}
							className="dark:bg-[#272930]"
						/>
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
	const { trans } = useTranslation();
	const { isTeamMember } = useOrganizationTeams();
	const [user] = useRecoilState(userState);
	const { isOpen, closeModal, openModal } = useModal();

	const router = useRouter();

	const isTeamDropdownAllowed = useMemo(() => {
		const notAllowedList = ['/task/[id]', '/profile/[memberId]'];
		return !notAllowedList.includes(router.route);
	}, [router.route]);

	return (
		<>
			{!user && !notFound && !publicTeam ? (
				<HeaderSkeleton />
			) : (
				<nav
					className={clsxm(
						'bg-white dark:bg-dark-high w-full nav-items--shadow dark:border-b-[0.125rem] dark:border-b-[#26272C]',
						className
					)}
				>
					<Container>
						<div className="w-full flex justify-between items-center min-h-[90px]">
							<EverTeamsLogo dash />
							{!notFound && (
								<div className="flex items-center gap-10">
									{publicTeam && (
										<Button
											className="py-3.5 px-4 gap-3 rounded-xl outline-none"
											onClick={openModal}
										>
											{trans.common.JOIN_REQUEST}
										</Button>
									)}
									{showTimer && <MinTimerFrame />}

									{!publicTeam && <Collaborate />}

									{isTeamMember && isTeamDropdownAllowed ? (
										<TeamsDropDown publicTeam={publicTeam || false} />
									) : null}

									{!publicTeam && <UserNavAvatar />}
								</div>
							)}
						</div>
					</Container>
					<RequestToJoinModal open={isOpen} closeModal={closeModal} />
				</nav>
			)}
		</>
	);
}
