import { FC } from 'react';
import { ThemeToggle } from '@ever-teams/atoms';
import { Logo } from '../ui/Logo';

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
		<footer className="relative overflow-hidden w-full  border-t  py-5 mt-6 border-slate-200 dark:border-slate-800 sm:flex sm:items-center gap-5 gap-y-8 md:gap-y-5 gap-x-3 sm:justify-between">
			<Logo className=" hover:text-gray-500 text-gray-800 transition-all duration-300 dark:text-gray-200 dark:hover:text-gray-400 xl:mr-auto" />

			<div className="flex items-center gap-4 text-sm mx-auto">
				{FooterLinks.map((elt, index) => {
					return (
						<a
							key={index}
							className="hover:underline inline-flex gap-x-2 capitalize text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
							href={elt.href}
							{...(elt.external && { target: '_blank', rel: 'noopener noreferrer' })}
						>
							{elt.label}
						</a>
					);
				})}
			</div>

			<div className="flex gap-4 text-sm  capitalize text-gray-600  dark:text-gray-400 ">
				<p>Copyright © 2024-present</p>
				<a className="hover:underline hover:text-white" href={'https://ever.co/'}>
					Ever Co. LTD.
				</a>
				<p>All Rights Reserved</p>
			</div>

			<div className="space-x-4 flex items-center justify-between">
				<ThemeToggle />
			</div>
		</footer>
	);
};
