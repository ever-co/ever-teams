import {
	TeamsModernTimer,
	TeamsLoginDialog,
	TeamsDailyActivityDisplayer,
	TeamsWeeklyActivityDisplayer,
	TeamsWorkedProjectDisplayer,
	TeamsPomodoroTimer,
	TeamsRegistrationDialog
} from '@ever-teams/atoms';
import React from 'react';
import { Link } from 'react-router-dom';

type Demo = { title: string; element: React.ReactNode };
type Cat = { name: string; description?: string; demos?: Demo[] };

const categories: Cat[] = [
	{
		name: 'Timers',
		description: 'Timer widgets and progress indicators',
		demos: [
			{
				title: 'TeamsModernTimer – Featured',
				element: (
					<TeamsModernTimer
						variant="bordered"
						size="lg"
						showProgress={true}
						expandable={true}
					/>
				)
			},
			{
				title: 'TeamsPomodoroTimer',
				element: <TeamsPomodoroTimer />
			}
		]
	},
	{
		name: 'Activity Displayers',
		description: 'Components for displaying work activity and time tracking',
		demos: [
			{
				title: 'TeamsDailyActivityDisplayer',
				element: <TeamsDailyActivityDisplayer showProgress={true} className="" />
			},
			{
				title: 'TeamsWeeklyActivityDisplayer',
				element: <TeamsWeeklyActivityDisplayer showProgress={true} className="" />
			},
			{
				title: 'TeamsWorkedProjectDisplayer',
				element: <TeamsWorkedProjectDisplayer showProgress={true} className="" />
			}
		]
	},
	{
		name: 'Authentication & User Management',
		description: 'Components for user authentication and profile management',
		demos: [
			{
				title: 'TeamsLoginDialog',
				element: <TeamsLoginDialog />
			},
			{
				title: 'TeamsRegistrationDialog',
				element: <TeamsRegistrationDialog />
			}
		]
	}
];

export default function Index() {
	return (
		<div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
			{/* Floating Elements Background */}
			<div className="fixed inset-0 overflow-hidden pointer-events-none">
				<div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300/30 dark:bg-purple-900/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
				<div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-300/30 dark:bg-cyan-900/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
				<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-300/30 dark:bg-pink-900/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000" />
			</div>

			{/* Hero Section with 3D Cards */}
			<div className="relative">
				<div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02]" />

				<div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
					<div className="text-center space-y-8">
						<div className="inline-block">
							<h1 className="text-8xl font-bold tracking-tight bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 dark:from-violet-400 dark:via-purple-400 dark:to-fuchsia-400 bg-clip-text text-transparent animate-gradient">
								Teams Vite Boilerplate
							</h1>
							<div className="h-1 w-full bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 dark:from-violet-400 dark:via-purple-400 dark:to-fuchsia-400 rounded-full mt-2" />
						</div>
						<p className="text-2xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
							Elevate your time tracking experience with our modern, elegant components
						</p>

						<div className="flex justify-center gap-6">
							<TeamsLoginDialog
								trigger={
									<button
										type="button"
										className="group relative px-8 py-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 dark:from-violet-600 dark:to-fuchsia-600 text-white rounded-xl font-medium overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl"
									>
										<span className="relative z-10">Explore Components</span>
										<div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500 to-violet-500 dark:from-fuchsia-600 dark:to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
									</button>
								}
							/>

							<a
								href="https://docs.ever.team"
								target="_blank"
								rel="noopener noreferrer"
								className="group relative px-8 py-4 bg-white dark:bg-gray-800 backdrop-blur-sm text-gray-800 dark:text-gray-200 rounded-xl font-medium overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl border border-gray-200 dark:border-gray-700 "
							>
								<span className="relative z-10">View Documentation</span>
							</a>
						</div>
					</div>
				</div>
			</div>

			{/* Featured Components with Interactive Cards */}
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
				<div className="space-y-32">
					{categories.map((cat, index) => (
						<section key={cat.name} className={`relative ${index % 2 === 0 ? '' : 'md:ml-32'}`}>
							<div className="absolute -left-4 top-0 w-2 h-full bg-gradient-to-b from-violet-500 to-fuchsia-500 dark:from-violet-400 dark:to-fuchsia-400 rounded-full" />
							<div className="pl-8">
								<div className="flex items-center gap-4 mb-8">
									<h2 className="text-4xl font-bold bg-gradient-to-r from-violet-500 to-fuchsia-500 dark:from-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent">
										{cat.name}
									</h2>
									<div className="h-px flex-1 bg-gradient-to-r from-violet-500/50 dark:from-violet-400/50 to-transparent" />
								</div>
								{cat.description && (
									<p className="text-lg text-gray-600 dark:text-gray-400 mb-12 max-w-2xl">
										{cat.description}
									</p>
								)}
								{cat.demos ? (
									<div className="grid gap-8 md:grid-cols-2 grid-cols-1">
										{cat.demos.map((d) => (
											<div
												key={d.title}
												className="group p-8 bg-white/50 dark:bg-gray-800/30 rounded-2xl backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/30 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
											>
												<h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200 group-hover:text-violet-500 dark:group-hover:text-violet-400 transition-colors">
													{d.title}
												</h3>
												<div className="flex justify-center transform group-hover:scale-105 transition-transform duration-300">
													{d.element}
												</div>
											</div>
										))}
									</div>
								) : (
									<p className="text-sm text-gray-400 dark:text-gray-500 italic">
										Component previews will be added here.
									</p>
								)}
							</div>
						</section>
					))}
				</div>
			</div>

			{/* Interactive Call to Action */}
			<div className="relative overflow-hidden bg-gradient-to-r from-violet-500 to-fuchsia-500 dark:from-violet-600 dark:to-fuchsia-600 rounded-4xl">
				<div className="absolute inset-0 bg-grid-white/[0.05]" />
				<div className="absolute inset-0 bg-gradient-to-r from-violet-500/50 to-fuchsia-500/50 dark:from-violet-600/50 dark:to-fuchsia-600/50" />
				<div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
					<div className="text-center space-y-8">
						<h2 className="text-5xl font-bold text-white">Ready to Transform Your Time Tracking?</h2>
						<p className="text-xl text-white/90 max-w-2xl mx-auto">
							Join thousands of developers who are already using <code>@ever-teams/atoms</code> to build better
							time tracking experiences
						</p>
						<div className="flex justify-center gap-6">
							<Link
								to="/time/time-tracker"
								className="group relative px-8 py-4 bg-white text-violet-500 dark:text-violet-400 rounded-xl font-medium overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl"
							>
								<span className="relative z-10">Get Started</span>
								<div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
							</Link>
							<Link
								to="/components"
								className="group relative px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl font-medium overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl border border-white/20"
							>
								<span className="relative z-10">View Examples</span>
							</Link>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
