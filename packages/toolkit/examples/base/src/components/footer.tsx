'use client';
import { FC } from 'react';
import { ThemeToggle } from '@ever-teams/atoms';
import Link from 'next/link';

const FooterLinks: {
	href: string;
	label: string;
	external?: boolean;
}[] = [
	{ href: 'https://ever.co/about-us', label: 'About Us', external: true },
	{ href: 'https://blog.ever.team/', label: 'Blog', external: true },
	{ href: 'https://ever.team/tos', label: 'Terms Of Service', external: true },
	{ href: 'https://ever.team/privacy', label: 'Privacy Policy', external: true },
	{ href: 'https://ever.team/cookies', label: 'Cookie Policy', external: true },
	{ href: 'https://ever.team/delete', label: 'Delete Data', external: true }
];
export const Footer: FC = () => {
	return (
		<footer className="overflow-hidden relative gap-x-3 gap-5 gap-y-8 p-5 mt-6 w-full border-t border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 sm:flex sm:items-center md:gap-y-5 sm:justify-between">
			<div className="flex gap-4 items-center text-sm">
				{FooterLinks.map((elt, index) => {
					return (
						<Link
							key={index}
							className="inline-flex gap-x-2 text-gray-600 capitalize hover:underline hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
							href={elt.href}
							target={elt.external ? '_blank' : ''}
						>
							{elt.label}
						</Link>
					);
				})}
			</div>

			<div className="flex gap-4 text-sm text-gray-600 capitalize dark:text-gray-400">
				<p>Copyright © 2024-present</p>
				<Link className="hover:underline hover:text-white" href={'https://ever.co/'}>
					Ever Co. LTD.
				</Link>
				<p>All Rights Reserved</p>
			</div>

			<div className="flex justify-between items-center space-x-4">
				<ThemeToggle />
			</div>
		</footer>
	);
};
