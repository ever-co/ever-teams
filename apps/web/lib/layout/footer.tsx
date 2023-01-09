import { clsxm } from '@app/utils';
import { Text, ThemeToggler } from 'lib/components';

export function Footer({ className }: { className?: string }) {
	return (
		<footer
			className={clsxm(
				'flex flex-col md:flex-row justify-around items-center w-full py-6 px-3',
				className
			)}
		>
			<p className="text-neutral text-xs font-normal leading-4 -tracking-[-0.02em] text-center md:mb-2 mb-7">
				© 2022-Present,{' '}
				<Text.Link href="https://gauzy.team">Gauzy Teams</Text.Link> by{' '}
				<Text.Link href="https://ever.co/">Ever Co</Text.Link>. LTD. All rights
				reserved.
			</p>

			<div>
				<ThemeToggler />
			</div>
		</footer>
	);
}
