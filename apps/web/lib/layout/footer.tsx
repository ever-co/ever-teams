import { ThemeToggler } from 'lib/components/theme-toggler';

export default function Footer() {
	return (
		<div className="flex justify-around items-center w-full my-6">
			<p className="text-neutral text-xs font-normal leading-4 -tracking-[-0.02em]">
				©2022. https://gauzy.teams, Powered by Gauzy. All right reserved, Terms
				of Services
			</p>

			<ThemeToggler />
		</div>
	);
}
