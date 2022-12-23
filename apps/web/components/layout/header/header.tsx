import MainLogo from './mainLogo';
import { TeamsDropDown } from '../../shared/teams/teams-dropdown';
import Profile from './profile';
// import { IDrowDownData } from "@app/interfaces/hooks";

export const Header = () => {
	return (
		<header className="fixed w-full z-50">
			<nav className="bg-white py-2 dark:bg-[#202023] shadow-sm">
				<div className="flex flex-wrap justify-between items-center x-container-fluid">
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
