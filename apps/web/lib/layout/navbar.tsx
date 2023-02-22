import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Container } from 'lib/components';
import { AppLogo } from 'lib/components/svgs';
import { MinTimerFrame, TeamsDropDown, UserNavAvatar } from 'lib/features';

export function Navbar({
	className,
	showTimer,
	publicTeam,
}: IClassName & { showTimer?: boolean; publicTeam?: boolean }) {
	return (
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
	);
}
