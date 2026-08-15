import { useAtomValue } from 'jotai';
import { PropsWithChildren } from 'react';
import { cn } from '@ever-teams/toolkit-ui';
import { Navbar } from './navbar/nav-bar';
import FooterBlock from './footer/footer-block';
import { BaseLayout } from './base-layout';

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
	showTimer,
	publicTeam,
	notFound,
	className,
	childrenClassName,
	footerClassName = ''
}: Props) {
	return (
		<BaseLayout className="flex flex-col" contentClassName="flex-grow">
			<Navbar className="fixed z-[999] bg-transparent backdrop-blur-lg" />

			<main className="flex-grow pt-24 px-6 mb-48">
				<div className={cn('mx-auto max-w-[1400px]', className)}>
					<div className={cn('w-full', childrenClassName)}>{children}</div>
				</div>
			</main>

			<FooterBlock systemStatus={{ status: 'normal', message: 'All systems normal' }} />
		</BaseLayout>
	);
}
