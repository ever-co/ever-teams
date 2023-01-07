import { Footer, Navbar } from '.';
import { Container, Meta } from 'lib/components';
import { PropsWithChildren } from 'react';

type Props = PropsWithChildren & { title?: string };

export function MainLayout({ children, title }: Props) {
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
			<Navbar className="fixed" />

			<div className="w-full flex flex-col items-start justify-between h-screen min-h-[500px] pt-20">
				<div className="flex-1">{children}</div>

				<Container>
					<hr className="dark:opacity-25" />
					<Footer className="justify-between px-0" />
				</Container>
			</div>
		</>
	);
}
