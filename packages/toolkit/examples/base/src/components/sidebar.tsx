'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import {
	TimerIcon,
	BarChartIcon,
	PersonIcon,
	ChevronRightIcon,
	ChevronDownIcon,
	GearIcon
} from '@radix-ui/react-icons';
import { TeamsLogo } from '@ever-teams/toolkit-ui';

type RouteChild = {
	label: string;
	href?: string;
	children?: RouteChild[];
};

type Route = {
	label: string;
	icon: React.JSX.Element;
	children: RouteChild[];
};

const routes: Route[] = [
	{
		label: 'Timers',
		icon: <TimerIcon className="w-4 h-4" />,
		children: [
			{ label: 'Teams Modern Timer', href: '/components/timer/teams-modern-timer' },
			{ label: 'Teams Basic Timer', href: '/components/timer/teams-basic-timer' },
			{ label: 'Teams Essential Timer', href: '/components/timer/teams-essential-timer' },
			{ label: 'Teams Custom Timer', href: '/components/timer/teams-custom-timer' },
			{ label: 'Teams Extra Timer', href: '/components/timer/teams-extra-timer' }
		]
	},
	{
		label: 'Reports',
		icon: <BarChartIcon className="w-4 h-4" />,
		children: [
			{
				label: 'Working Hours',
				children: [
					{ label: 'Bar Chart', href: '/components/reports/working-hours/bar' },
					{ label: 'Line Chart', href: '/components/reports/working-hours/line' },
					{ label: 'Radial Chart', href: '/components/reports/working-hours/radial' }
				]
			},
			{
				label: 'Displayers',
				href: '/components/reports/displayer'
			},
			{ label: 'Apps and Urls', href: '/components/reports/list-report/app-and-url' },
			{ label: 'Worked Tasks', href: '/components/reports/list-report/tasks' },
			{ label: 'Worked Projects', href: '/components/reports/list-report/projects' }
		]
	},
	{
		label: 'UI Components',
		icon: <GearIcon className="w-4 h-4" />,
		children: [
			{ label: 'Buttons', href: '/components/ui/buttons' },
			{ label: 'Forms', href: '/components/ui/forms' },
			{ label: 'Toggles', href: '/components/ui/toggles' },
			{ label: 'Progress', href: '/components/ui/progress' },
			{ label: 'MultiSelect', href: '/components/ui/multiselect' }
		]
	}
];

export function Sidebar() {
	const pathname = usePathname();
	const { theme } = useTheme();
	const [openSections, setOpenSections] = useState<string[]>(['Timers']);
	const [openSubSections, setOpenSubSections] = useState<string[]>(['Teams Modern Timer']);

	const toggleSection = (label: string) => {
		setOpenSections((prev) => (prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]));
	};

	const toggleSubSection = (label: string) => {
		setOpenSubSections((prev) => (prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]));
	};

	return (
		<div className="min-h-screen sticky top-0 flex flex-col bg-white/75 dark:bg-slate-950 backdrop-blur-sm border-r dark:border-slate-800 border-slate-200 w-64">
			<div className="flex-1 px-3 py-4 mt-5">
				<Link href="/" className="flex items-center pl-3 mb-14">
					<TeamsLogo />
				</Link>

				<nav className="space-y-4">
					{routes.map((route) => (
						<div key={route.label}>
							{/* Level 1 */}
							<button
								onClick={() => toggleSection(route.label)}
								className="w-full flex items-center justify-between px-3 py-2 text-slate-900 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-md"
							>
								<div className="flex items-center">
									{route.icon}
									<span className="ml-2 text-sm font-medium">{route.label}</span>
								</div>
								{route.children &&
									(openSections.includes(route.label) ? (
										<ChevronDownIcon className="h-4 w-4" />
									) : (
										<ChevronRightIcon className="h-4 w-4" />
									))}
							</button>

							{/* Level 2 */}
							{openSections.includes(route.label) &&
								route.children?.map((child) => (
									<div key={child.label} className="mt-1">
										{child.children ? (
											<button
												onClick={() => toggleSubSection(child.label)}
												className="w-full flex items-center justify-between px-6 py-2.5 text-slate-800 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-md"
											>
												<span className="text-sm">{child.label}</span>
												{openSubSections.includes(child.label) ? (
													<ChevronDownIcon className="h-3 w-3" />
												) : (
													<ChevronRightIcon className="h-3 w-3" />
												)}
											</button>
										) : (
											<Link
												href={child.href || ''}
												className={cn(
													'flex items-center py-2.5 px-6 text-sm rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-400',
													pathname === child.href
														? 'bg-slate-100 dark:bg-slate-800 font-medium'
														: 'transparent'
												)}
											>
												{child.label}
											</Link>
										)}

										{/* Level 3 */}
										{openSubSections.includes(child.label) &&
											child.children?.map((subChild) => (
												<Link
													key={subChild.href}
													href={subChild.href || ''}
													className={cn(
														'flex items-center py-2.5 px-9 text-sm rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-400 mt-1',
														pathname === subChild.href
															? 'bg-slate-100 dark:bg-slate-800 font-medium'
															: 'transparent'
													)}
												>
													{subChild.label}
												</Link>
											))}
									</div>
								))}
						</div>
					))}
				</nav>
			</div>
		</div>
	);
}
