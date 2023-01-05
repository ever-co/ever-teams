import { ThemeToggler } from 'lib/components';

export default function Footer() {
	return (
		<div className="flex flex-col md:flex-row justify-around items-center w-full my-6">
			<p className="text-neutral text-xs font-normal leading-4 -tracking-[-0.02em] text-center">
				©2022. https://gauzy.teams, Powered by Gauzy. All right reserved, Terms
				of Services
			</p>

			<div className="md:mt-0 mt-7">
				<ThemeToggler />
			</div>
		</div>
	);
}
