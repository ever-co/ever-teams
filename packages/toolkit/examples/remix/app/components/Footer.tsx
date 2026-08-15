import { Link } from '@remix-run/react';
import { ThemeToggle } from '@ever-teams/atoms';
import { TeamsLogo } from '@ever-teams/toolkit-ui';

const FooterLinks = [
	{ href: 'https://ever.co/about-us', label: 'About Us', external: true },
	{ href: 'https://blog.ever.team/', label: 'Blog', external: true },
	{ href: 'https://ever.team/tos', label: 'Terms Of Service', external: true },
	{ href: 'https://ever.team/privacy', label: 'Privacy Policy', external: true },
	{ href: 'https://ever.team/cookies', label: 'Cookie Policy', external: true },
	{ href: 'https://ever.team/delete', label: 'Delete Data', external: true }
];

export function Footer() {
	return (
		<footer className="relative overflow-hidden w-full border-t py-5 mt-6 border-slate-200 dark:border-slate-800">
			<div className="container mx-auto px-4 sm:px-6 lg:px-8">
				<div className="sm:flex sm:items-center gap-5 gap-y-8 md:gap-y-5 gap-x-3 sm:justify-between">
					<TeamsLogo className="w-[100px] hover:text-gray-500 text-gray-800 transition-all duration-300 dark:text-gray-200 dark:hover:text-gray-400 xl:mr-auto" />

					<div className="flex items-center gap-4 text-sm mx-auto">
						{FooterLinks.map((link) => (
							<Link
								key={link.href}
								className="hover:underline inline-flex gap-x-2 capitalize text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
								to={link.href}
								target={link.external ? '_blank' : undefined}
								rel={link.external ? 'noopener noreferrer' : undefined}
							>
								{link.label}
							</Link>
						))}
					</div>

					<div className="flex gap-4 text-sm capitalize text-gray-600 dark:text-gray-400">
						<p>Copyright © 2024-present</p>
						<Link
							className="hover:underline hover:text-gray-800 dark:hover:text-gray-200"
							to="https://ever.co/"
						>
							Ever Co. LTD.
						</Link>
						<p>All Rights Reserved</p>
					</div>

					<div className="flex items-center justify-between">
						<ThemeToggle />
					</div>
				</div>
			</div>
		</footer>
	);
}
