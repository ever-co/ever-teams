import clsxm from '@app/utils/clsxm';
import { Container } from 'lib/components';
import { AppLogo } from 'lib/components/svgs';

export function Navbar({ className }: { className?: string }) {
	return (
		<nav
			className={clsxm(
				'bg-white dark:bg-dark-high w-full shadow-lg',
				className
			)}
			style={{ boxShadow: '0px 14px 24px -10px rgba(0, 0, 0, 0.04)' }}
		>
			<Container>
				<div className="w-full flex justify-between items-center min-h-[70px]">
					<AppLogo className="scale-[0.7] origin-[0]" />
				</div>
			</Container>
		</nav>
	);
}
