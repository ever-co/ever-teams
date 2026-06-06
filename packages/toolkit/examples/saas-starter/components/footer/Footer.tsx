'use client';
import { FC } from 'react';
import { ThemeToggle } from '@ever-teams/atoms';
import Link from 'next/link';
import { Logo } from '../ui/logo';

const FooterLinks: {
	href: string;
	label: string;
	external?: boolean;
}[] = [
	{ href: 'https://ever.co/about-us', label: 'About Us', external: true },
	{ href: 'https://blog.ever.team/', label: 'Blog', external: true },
	{ href: 'https://ever.team/tos', label: 'Terms Of Service', external: true },
	{ href: 'https://ever.team/privacy', label: 'Privacy Policy', external: true },
	{ href: 'https://ever.team/cookies', label: 'Cookie Policy', external: true }
];
export const Footer: FC = () => {
	return (
		<footer className="w-full border-slate-200 dark:border-slate-800 border-t py-6 md:py-8">
			<div className="container mx-auto px-4 sm:px-6 lg:px-8">
				{/* Mobile Layout - Stacked */}
				<div className="flex flex-col items-center justify-center space-y-6 md:hidden">
					{/* Logo */}
					<Link href={'/'}>
						<Logo />
					</Link>

					{/* Footer Links */}
					<div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
						{FooterLinks.map((elt, index) => {
							return (
								<Link
									key={index}
									className="hover:underline inline-flex gap-x-2 capitalize text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 whitespace-nowrap"
									href={elt.href}
									target={elt.external ? '_blank' : ''}
								>
									{elt.label}
								</Link>
							);
						})}
					</div>

					{/* Copyright */}
					<div className="flex flex-col items-center space-y-1 text-xs text-center text-gray-600 dark:text-gray-400">
						<p>Copyright © 2024-present</p>
						<div className="flex items-center space-x-1">
							<Link
								className="hover:underline hover:text-gray-800 dark:hover:text-gray-200"
								href={'https://ever.co/'}
							>
								Ever Co. LTD.
							</Link>
							<span>All Rights Reserved</span>
						</div>
					</div>

					{/* Theme Toggle */}
					<div className="flex justify-center">
						<ThemeToggle />
					</div>
				</div>

				{/* Desktop Layout - Horizontal */}
				<div className="hidden md:flex md:items-center md:justify-between md:space-x-8">
					{/* Logo */}
					<Link href={'/'}>
						<Logo />
					</Link>

					{/* Footer Links */}
					<div className="flex items-center justify-center flex-wrap gap-x-6 gap-y-2 text-sm flex-1">
						{FooterLinks.map((elt, index) => {
							return (
								<Link
									key={index}
									className="hover:underline inline-flex gap-x-2 capitalize text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 whitespace-nowrap"
									href={elt.href}
									target={elt.external ? '_blank' : ''}
								>
									{elt.label}
								</Link>
							);
						})}
					</div>

					{/* Copyright and Theme Toggle */}
					<div className="flex items-center space-x-6 flex-shrink-0">
						<div className="hidden lg:flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
							<p>Copyright © 2024-present</p>
							<Link
								className="hover:underline hover:text-gray-800 dark:hover:text-gray-200"
								href={'https://ever.co/'}
							>
								Ever Co. LTD.
							</Link>
							<p>All Rights Reserved</p>
						</div>

						{/* Simplified copyright for medium screens */}
						<div className="lg:hidden text-sm text-gray-600 dark:text-gray-400">
							<p>© 2024 Ever Co. LTD.</p>
						</div>

						<ThemeToggle />
					</div>
				</div>
			</div>
		</footer>
	);
};
