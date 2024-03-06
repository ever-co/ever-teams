'use client';

import { clsxm } from '@app/utils';
import { Toaster } from '@components/ui/toaster';
import { Container, Divider, Meta } from 'lib/components';
import { PropsWithChildren } from 'react';
import { Footer, Navbar } from '.';
import { useRecoilValue } from 'recoil';
import { fullWidthState } from '@app/stores/fullWidth';

type Props = PropsWithChildren<{
	title?: string;
	showTimer?: boolean;
	publicTeam?: boolean;
	notFound?: boolean;
	className?: string;
	childrenClassName?: string;
	footerClassName?: string;
}>;

export function MainLayout({
	children,
	title,
	showTimer,
	publicTeam,
	notFound,
	className,
	childrenClassName,
	footerClassName = ''
}: Props) {
	const fullWidth = useRecoilValue(fullWidthState);
	return (
		<div className="w-full">
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
					'w-full flex flex-col  lg:items-start justify-between h-screen min-h-[500px] pt-20',
					className
				)}
			>
				<div className={clsxm('lg:flex-1 lg:w-full', childrenClassName)}>{children}</div>

				<Container
					fullWidth={fullWidth}
					className={clsxm('w-full px-8', fullWidth && '!mx-0', footerClassName)}
				>
					<Divider />
					<Footer className="justify-between px-0 w-full mx-auto" />
				</Container>
			</div>
			<Toaster />
		</div>
	);
}
