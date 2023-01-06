import clsxm from '@app/utils/clsxm';
import { ThemeToggler } from 'lib/components';

export function Footer({ className }: { className?: string }) {
	return (
		<div
			className={clsxm(
				'flex flex-col md:flex-row justify-around items-center w-full py-6 px-3',
				className
			)}
		>
			<p className="text-neutral text-xs font-normal leading-4 -tracking-[-0.02em] text-center md:mb-2 mb-7">
				©2022. https://gauzy.teams, Powered by Gauzy. All right reserved, Terms
				of Services
			</p>

			<div>
				<ThemeToggler />
			</div>
		</div>
	);
}
