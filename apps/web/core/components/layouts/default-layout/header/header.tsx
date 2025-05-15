import MainLogo from './main-logo';
import { TeamsDropDown } from '@/core/components/teams/teams-dropdown_';
import Profile from './profile';

/**
 * The header component.
 *
 * This component is fixed at the top of the page and contains the main logo,
 * a dropdown to select a team, and a profile menu.
 *
 * @returns The header component.
 */
export const Header = () => {
	return (
		<header className="fixed z-50 w-full">
			<nav className="bg-white py-2 dark:bg-[#202023] shadow-sm">
				<div className="flex flex-wrap items-center justify-between x-container-fluid">
					<div className="flex items-center justify-center">
						<MainLogo />
					</div>

					<div className="w-[380px] flex items-center justify-between">
						<div>
							<TeamsDropDown />
						</div>
						<div className="flex items-center justify-center h-full">
							<Profile />
						</div>
					</div>
				</div>
			</nav>
		</header>
	);
};

export default Header;
