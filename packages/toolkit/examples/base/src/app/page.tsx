'use client';

import { Button } from '@ever-teams/toolkit-ui';
import Link from 'next/link';
import { ArrowRightIcon } from '@radix-ui/react-icons';
import { TeamsThemeToggle, TeamsModernTimer } from '@ever-teams/atoms';

export default function Page() {
	return (
		<div className="flex flex-col min-h-screen">
			{/* Hero Section */}
			<div className="flex flex-col justify-center items-center px-4 py-32 space-y-8 text-center bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
				{/* <div className="flex gap-2 items-center px-3 py-1 text-sm rounded-full text-slate-600 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-800/50">
          <span>Now with drag and drop builder</span>
          <Link href="/grapesjs" className="underline">Try it out →</Link>
        </div> */}

				<h1 className="text-6xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Teams SDK</h1>
				<p className="text-xl text-slate-600 dark:text-slate-400 max-w-[600px]">
					A comprehensive suite of time tracking and productivity components built with React and Tailwind
					CSS.
				</p>
				<div className="flex gap-4">
					<Link
						href="/components/timer/modern-timer"
						className="inline-flex gap-2 justify-center items-center px-6 py-3 text-base font-medium text-white rounded-lg transition-colors duration-200 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
					>
						Browse Components
						<ArrowRightIcon className="w-4 h-4" />
					</Link>
					<Link
						href="https://docs.ever.team"
						className="inline-flex justify-center items-center px-6 py-3 text-base font-medium rounded-lg border transition-colors duration-200 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/50"
					>
						Documentation
					</Link>
				</div>
			</div>

			{/* Features Grid */}
			<div className="container grid grid-cols-1 gap-8 px-4 py-12 mx-auto md:grid-cols-3">
				<Link
					href={'/components/timer/modern-timer'}
					className="p-4 space-y-4 rounded-lg border border-gray-200 bg-slate-100 dark:bg-slate-900 dark:border-gray-800"
				>
					<h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Time Tracking</h3>
					<p className="text-slate-600 dark:text-slate-400">
						Comprehensive suite of time tracking components from basic timers to advanced progress
						indicators.
					</p>
				</Link>
				<Link
					href={'/components/reports/working-hours/bar'}
					className="p-4 space-y-4 rounded-lg border border-gray-200 bg-slate-100 dark:bg-slate-900 dark:border-gray-800"
				>
					<h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Data Visualization</h3>
					<p className="text-slate-600 dark:text-slate-400">
						Beautiful charts and graphs to visualize productivity data and team performance.
					</p>
				</Link>
				<Link
					href={'/components/reports/displayer'}
					className="p-4 space-y-4 rounded-lg border border-gray-200 bg-slate-100 dark:bg-slate-900 dark:border-gray-800"
				>
					<h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Team Management</h3>
					<p className="text-slate-600 dark:text-slate-400">
						Components for managing team members, tracking progress, and monitoring activities.
					</p>
				</Link>
			</div>
			{/* Component Preview */}
			<div className="container grid grid-cols-1 gap-12 items-center px-4 mx-auto lg:grid-cols-2">
				<div className="space-y-6">
					<h2 className="text-4xl font-bold text-slate-900 dark:text-slate-100">Modern Design System</h2>
					<p className="text-lg text-slate-600 dark:text-slate-400">
						Built with modern web technologies and best practices. Fully customizable, accessible, and dark
						mode ready.
					</p>
					<ul className="space-y-4 text-slate-600 dark:text-slate-400">
						<li className="flex gap-2 items-center">
							<svg
								className="w-5 h-5 text-green-500"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
							</svg>
							Responsive and accessible components
						</li>
						<li className="flex gap-2 items-center">
							<svg
								className="w-5 h-5 text-green-500"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
							</svg>
							Dark mode support out of the box
						</li>
						<li className="flex gap-2 items-center">
							<svg
								className="w-5 h-5 text-green-500"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
							</svg>
							Built with TypeScript and React
						</li>
					</ul>
				</div>

				<div className="p-8 space-y-4 bg-gradient-to-b rounded-xl backdrop-blur-sm from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
					<div className="flex gap-2 items-center">
						<h3 className="text-sm font-medium text-slate-700 dark:text-slate-400">Try the theme:</h3>
						<TeamsThemeToggle />
					</div>

					<div>
						<TeamsModernTimer variant="bordered" size="lg" expandable={true} showProgress={true} />
					</div>
				</div>
			</div>
		</div>
	);
}
