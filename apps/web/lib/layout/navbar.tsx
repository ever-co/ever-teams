import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Button, Container } from 'lib/components';
import { AppLogo } from 'lib/components/svgs';
import { MinTimerFrame, TeamsDropDown, UserNavAvatar } from 'lib/features';
import Skeleton from 'react-loading-skeleton';
import { useOrganizationTeams, useModal } from '@app/hooks';
import { useRecoilState } from 'recoil';
import { userState } from '@app/stores';
import { RequestToJoinModal } from '@components/layout/header/request-to-join-modal';

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
						<Skeleton
							height={45}
							width={175}
							borderRadius={20}
							className="dark:bg-[#272930]"
						/>
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
	notFound,
}: IClassName & {
	showTimer?: boolean;
	publicTeam?: boolean;
	notFound?: boolean;
}) {
	const { isTeamMember } = useOrganizationTeams();
	const [user] = useRecoilState(userState);
	const { isOpen, closeModal, openModal } = useModal();

	return (
		<>
			{!user && !publicTeam ? (
				<HeaderSkeleton />
			) : (
				<nav
					className={clsxm(
						'bg-white dark:bg-dark-high w-full nav-items--shadow',
						className
					)}
				>
					<Container>
						<div className="w-full flex justify-between items-center min-h-[70px]">
							<AppLogo
								dash
								className="scale-[0.7] origin-[0] w-4/5 md:w-full"
							/>
							{!notFound && (
								<div className="flex space-x-5 items-center">
									{publicTeam && (
										<Button
											className="pr-[2rem] pl-[2rem] rounded-lg"
											onClick={openModal}
										>
											Request to join
										</Button>
									)}
									{showTimer && <MinTimerFrame />}
									{isTeamMember ? (
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
