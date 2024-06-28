'use client';

import { clsxm } from '@app/utils';
import { Toaster, ToastMessageManager } from '@components/ui/toaster';
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
		<div className="w-full ">
			<style jsx global>
				{`
					:root {
						--tw-color-dark--theme: #191a20;
					}
					.mx-8-container {
						${fullWidth
							? `
							margin-left: 2rem;
							margin-right: 2rem;
							`
							: `	--tblr-gutter-x: 1.5rem;
						--tblr-gutter-y: 0;
						width: 100%;
						padding-right: calc(var(--tblr-gutter-x) * 0.5);
						padding-left: calc(var(--tblr-gutter-x) * 0.5);
						margin-right: auto;
						margin-left: auto;`}
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
				<div className={clsxm('lg:flex-1 lg:w-full ', childrenClassName)}>{children}</div>
				<Container
					fullWidth={fullWidth}
					className={clsxm('w-full  px-8', fullWidth && '!mx-0', footerClassName)}
				>
					<Divider />
					<Footer className="justify-between w-full px-0  mx-auto" />
				</Container>
			</div>
			<Toaster />
			<ToastMessageManager />
		</div>
	);
}
