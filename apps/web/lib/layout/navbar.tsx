import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Container } from 'lib/components';
import { AppLogo } from 'lib/components/svgs';
import { MinTimerFrame, TeamsDropDown, UserNavAvatar } from 'lib/features';
import Skeleton from 'react-loading-skeleton';
import { useSkeleton } from '@app/hooks/useSkeleton';

const HeaderSkeleton = () => {
	return (
		<nav className="bg-white dark:bg-dark-high w-full nav-items--shadow fixed z-[999]">
			<Container>
				<div className="w-full flex justify-between items-center min-h-[70px]">
					<Skeleton height={45} width={200} borderRadius={20} className="dark:bg-[#272930]"/>
					<div className="flex space-x-5 items-center">
						<Skeleton height={45} width={175} borderRadius={20} className="dark:bg-[#272930]" />
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
}: IClassName & { showTimer?: boolean; publicTeam?: boolean }) {
	const { showSkeleton } = useSkeleton();
	return (
		<>
			{!showSkeleton ? (
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
							<AppLogo dash className="scale-[0.7] origin-[0]" />
							<div className="flex space-x-5 items-center">
								{showTimer && <MinTimerFrame />}
								<TeamsDropDown publicTeam={publicTeam || false} />
								{!publicTeam && <UserNavAvatar />}
							</div>
						</div>
					</Container>
				</nav>
			)}
		</>
	);
}
