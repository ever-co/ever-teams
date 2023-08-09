import { Footer, Navbar } from '.';
import { Container, Divider, Meta } from 'lib/components';
import { PropsWithChildren } from 'react';
import { clsxm } from '@app/utils';
import { Toaster } from '@components/ui/toaster';

type Props = PropsWithChildren<{
	title?: string;
	showTimer?: boolean;
	publicTeam?: boolean;
	notFound?: boolean;
	className?: string;
	childrenClassName?: string;
}>;

export function MainLayout({
	children,
	title,
	showTimer,
	publicTeam,
	notFound,
	className,
	childrenClassName,
}: Props) {
	return (
		<>
			<style jsx global>
				{`
					:root {
						--tw-color-dark--theme: #191a20;
					}
				`}
			</style>

			<Meta title={title} />
			<Navbar
				showTimer={showTimer}
				className="fixed z-[999]"
				publicTeam={publicTeam || false}
				notFound={notFound || false}
			/>

			<div
				className={clsxm(
					'w-full flex flex-col lg:items-start justify-between h-screen min-h-[500px] pt-20',
					className
				)}
			>
				<div className={clsxm('lg:flex-1 lg:w-full', childrenClassName)}>
					{children}
				</div>

				<Container>
					<Divider />
					<Footer className="justify-between px-0" />
				</Container>
			</div>
			<Toaster />
		</>
	);
}
