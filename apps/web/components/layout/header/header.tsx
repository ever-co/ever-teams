import MainLogo from './mainLogo';
import { TeamsDropDown } from '../../common/dropDown';
import Profile from './profile';

export const Header = () => {
	return (
		<header className="fixed w-full z-50 ">
			<nav className="bg-white py-2 dark:bg-[#202023] mx-[80px]">
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
