import {
	TeamsTrackingFilter,
	TeamsTrackingSessionInsight,
	TeamsTrackingClickInsight,
	TeamsTrackingHeatmap,
	TeamsTrackingSessionReplay
} from '@ever-teams/atoms';

export default function ReplayPage() {
	return (
		<div className="w-full max-w-7xl mx-auto px-4 py-8">
			{/* Header */}
			<div className="text-center mb-12">
				<h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">Session Replay & Analytics</h1>
				<p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
					Analyze user behavior, track interactions, and replay sessions to understand how users engage with
					your application.
				</p>
			</div>

			{/* Tracking Filter */}
			<div className="mb-8">
				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
					<h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Filter Sessions</h2>
					<TeamsTrackingFilter />
				</div>
			</div>

			{/* Analytics Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
				{/* Session Insights */}
				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
					<h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Session Insights</h3>
					<TeamsTrackingSessionInsight />
				</div>

				{/* Click Insights */}
				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
					<h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Click Analytics</h3>
					<TeamsTrackingClickInsight />
				</div>
			</div>

			{/* Heatmap */}
			<div className="mb-8">
				<TeamsTrackingHeatmap className="w-full" />
			</div>

			{/* Session Replay */}
			<div className="mb-8">
				<TeamsTrackingSessionReplay className="w-full" />
			</div>

			{/* Features Overview */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
				<div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
					<div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-4">
						<svg
							className="w-6 h-6 text-blue-600 dark:text-blue-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-label="Video recording icon"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
							/>
						</svg>
					</div>
					<h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Session Recording</h3>
					<p className="text-gray-600 dark:text-gray-400">
						Record and replay user sessions to understand user behavior and identify pain points.
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
					<h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Click Analytics</h3>
					<p className="text-gray-600 dark:text-gray-400">
						Track user clicks and interactions to optimize your interface and improve user experience.
					</p>
				</div>

				<div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
					<div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto mb-4">
						<svg
							aria-hidden="true"
							className="w-6 h-6 text-purple-600 dark:text-purple-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-label="Security icon"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
							/>
						</svg>
					</div>
					<h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Privacy Focused</h3>
					<p className="text-gray-600 dark:text-gray-400">
						All tracking is privacy-compliant with data anonymization and user consent management.
					</p>
				</div>
			</div>
		</div>
	);
}
