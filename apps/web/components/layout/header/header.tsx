import MainLogo from './mainLogo';
import { TeamsDropDown } from '../../common/dropDown';
import Profile from './profile';

export const Header = () => {
	return (
		<header className="fixed w-full z-50 shadow-sm dark:bg-[#232C3B]">
			<nav className="bg-white py-3 mx-[80px] dark:bg-[#232C3B]">
				<div className="flex flex-wrap justify-between items-center x-container-fluid">
					<div className="flex items-center justify-center">
						<MainLogo />
					</div>

					<div className="flex items-center justify-between">
						<div className="rounded-[10px] border-[1px] flex flex-row justify-end">
							<TeamsDropDown />
						</div>
						<div className="flex items-center justify-center h-full ml-[40px]">
							<Profile />
						</div>
					</div>
				</div>
			</nav>
		</header>
	);
};

export default Header;
