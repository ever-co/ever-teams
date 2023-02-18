import clsx from 'clsx';
import { Footer, Navbar } from '.';
import { Container, Divider, Meta } from 'lib/components';
import { PropsWithChildren } from 'react';

type Props = PropsWithChildren<{
	title?: string;
	showTimer?: boolean;
	navbarClassname?: string;
	containerWrapperClassname?: string;
}>;

export function MainLayout({
	children,
	title,
	showTimer,
	navbarClassname,
	containerWrapperClassname,
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
				className={clsx('fixed z-[999]', navbarClassname)}
			/>

			<div
				className={clsx(
					'w-full flex flex-col items-start justify-between h-screen min-h-[500px] pt-20',
					containerWrapperClassname
				)}
			>
				<div className="flex-1 w-full">{children}</div>

				<Container>
					<Divider />
					<Footer className="justify-between px-0" />
				</Container>
			</div>
		</>
	);
}
