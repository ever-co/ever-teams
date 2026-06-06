import { TeamsBasicReport } from '@ever-teams/atoms';

const RECENT_ACTIVITIES = [
	{ project: 'Website Redesign', time: '2h 30m', status: 'In Progress' },
	{ project: 'Mobile App Development', time: '4h 15m', status: 'Completed' },
	{ project: 'Database Optimization', time: '1h 45m', status: 'In Progress' },
	{ project: 'API Documentation', time: '3h 20m', status: 'Completed' }
];

export default function EmployeeReportsPage() {
	return (
		<div className="space-y-8">
			{/* Reports Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				{/* Default Report */}
				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
					<h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Time Overview</h3>
					<TeamsBasicReport />
				</div>

				{/* Line Chart Report */}
				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
					<h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Productivity Trends</h3>
					<TeamsBasicReport type="line" />
				</div>

				{/* Radial Chart Report */}
				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
					<h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Project Distribution</h3>
					<TeamsBasicReport type="radial" />
				</div>

				{/* Tooltip Report */}
				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
					<h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Detailed Metrics</h3>
					<TeamsBasicReport type="tooltip" />
				</div>
			</div>

			{/* Summary Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-blue-100">Total Hours</p>
							<p className="text-2xl font-bold">42.5h</p>
						</div>
						<div className="w-12 h-12 bg-blue-400 rounded-lg flex items-center justify-center">
							<svg
								aria-hidden="true"
								className="w-6 h-6"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						</div>
					</div>
				</div>

				<div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-green-100">Projects</p>
							<p className="text-2xl font-bold">8</p>
						</div>
						<div className="w-12 h-12 bg-green-400 rounded-lg flex items-center justify-center">
							<svg
								aria-hidden="true"
								className="w-6 h-6"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
								/>
							</svg>
						</div>
					</div>
				</div>

				<div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-purple-100">Efficiency</p>
							<p className="text-2xl font-bold">94%</p>
						</div>
						<div className="w-12 h-12 bg-purple-400 rounded-lg flex items-center justify-center">
							<svg
								aria-hidden="true"
								className="w-6 h-6"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
								/>
							</svg>
						</div>
					</div>
				</div>
			</div>

			{/* Recent Activity */}
			<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
				<h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Recent Activity</h3>
				<div className="space-y-4">
					{RECENT_ACTIVITIES.map((activity) => (
						<div
							key={activity.project}
							className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
						>
							<div>
								<p className="font-medium text-gray-900 dark:text-white">{activity.project}</p>
								<p className="text-sm text-gray-500 dark:text-gray-400">{activity.time}</p>
							</div>
							<span
								className={`px-2 py-1 rounded-full text-xs font-medium ${
									activity.status === 'Completed'
										? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
										: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
								}`}
							>
								{activity.status}
							</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
