import { TeamsModernTimer, TeamsEssentialTimer, TeamsPomodoroTimer } from '@ever-teams/atoms';
import { Carousel } from '@ever-teams/toolkit-ui';

export default function TimeTrackerPage() {
	const timerComponents = [
		{
			title: 'Modern Teams - Default',
			component: <TeamsModernTimer expandable={true} showProgress />
		},
		{
			title: 'Modern Teams - Expandable',
			component: <TeamsModernTimer expandable showProgress />
		},
		{
			title: 'Essential Teams - Default',
			component: <TeamsEssentialTimer />
		},
		{
			title: 'Pomodoro Timer',
			component: <TeamsPomodoroTimer />
		}
	];

	return (
		<div className="w-full max-w-6xl mx-auto px-4 py-8">
			{/* Header */}
			<div className="text-center mb-12">
				<h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">Time Tracker</h1>
				<p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
					Choose from our collection of time tracking components to start monitoring your productivity.
				</p>
			</div>

			{/* Timer Carousel */}
			<div className="mb-12">
				<Carousel className="w-full max-w-4xl mx-auto">
					{timerComponents.map((timer, index) => (
						<div key={index} className="flex-shrink-0 w-full">
							<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
								<h3 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">
									{timer.title}
								</h3>
								<div className="flex justify-center items-center min-h-[200px]">{timer.component}</div>
							</div>
						</div>
					))}
				</Carousel>
			</div>

			{/* Features Grid */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
				<div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
					<div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-4">
						<svg
							className="w-6 h-6 text-blue-600 dark:text-blue-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-label="Clock icon"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
					<h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Real-time Tracking</h3>
					<p className="text-gray-600 dark:text-gray-400">
						Track your time in real-time with precise accuracy and automatic session management.
					</p>
				</div>

				<div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
					<div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mx-auto mb-4">
						<svg
							className="w-6 h-6 text-green-600 dark:text-green-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-label="Analytics icon"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
							/>
						</svg>
					</div>
					<h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Detailed Analytics</h3>
					<p className="text-gray-600 dark:text-gray-400">
						Get comprehensive insights into your productivity patterns and time allocation.
					</p>
				</div>

				<div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
					<div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto mb-4">
						<svg
							className="w-6 h-6 text-purple-600 dark:text-purple-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-label="Team icon"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
							/>
						</svg>
					</div>
					<h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Team Collaboration</h3>
					<p className="text-gray-600 dark:text-gray-400">
						Collaborate with your team and share productivity insights across projects.
					</p>
				</div>
			</div>
		</div>
	);
}
