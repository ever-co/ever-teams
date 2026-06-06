import { TeamsBasicReport } from '@ever-teams/atoms';

const TEAM_MEMBERS = [
	{ name: 'Alice Johnson', hours: '42.5h', projects: 3, efficiency: '95%', status: 'Active' },
	{ name: 'Bob Smith', hours: '38.2h', projects: 2, efficiency: '88%', status: 'Active' },
	{ name: 'Carol Davis', hours: '45.1h', projects: 4, efficiency: '92%', status: 'Active' },
	{ name: 'David Wilson', hours: '35.8h', projects: 2, efficiency: '85%', status: 'Away' },
	{ name: 'Eva Brown', hours: '41.3h', projects: 3, efficiency: '90%', status: 'Active' }
];

export default function ManagerReportsPage() {
	return (
		<div className="space-y-8">
			{/* Team Overview */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
				<div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg p-6 text-white">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-indigo-100">Team Members</p>
							<p className="text-2xl font-bold">12</p>
						</div>
						<div className="w-12 h-12 bg-indigo-400 rounded-lg flex items-center justify-center">
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
									d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
								/>
							</svg>
						</div>
					</div>
				</div>

				<div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg p-6 text-white">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-emerald-100">Active Projects</p>
							<p className="text-2xl font-bold">15</p>
						</div>
						<div className="w-12 h-12 bg-emerald-400 rounded-lg flex items-center justify-center">
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

				<div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-orange-100">Total Hours</p>
							<p className="text-2xl font-bold">486h</p>
						</div>
						<div className="w-12 h-12 bg-orange-400 rounded-lg flex items-center justify-center">
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

				<div className="bg-gradient-to-r from-rose-500 to-rose-600 rounded-lg p-6 text-white">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-rose-100">Avg Efficiency</p>
							<p className="text-2xl font-bold">87%</p>
						</div>
						<div className="w-12 h-12 bg-rose-400 rounded-lg flex items-center justify-center">
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

			{/* Reports Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				{/* Team Performance */}
				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
					<h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Team Performance</h3>
					<TeamsBasicReport />
				</div>

				{/* Project Timeline */}
				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
					<h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Project Timeline</h3>
					<TeamsBasicReport type="line" />
				</div>

				{/* Resource Allocation */}
				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
					<h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Resource Allocation</h3>
					<TeamsBasicReport type="radial" />
				</div>

				{/* Detailed Analytics */}
				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
					<h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Detailed Analytics</h3>
					<TeamsBasicReport type="tooltip" />
				</div>
			</div>

			{/* Team Performance Table */}
			<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
				<h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Team Performance</h3>
				<div className="overflow-x-auto">
					<table className="w-full text-sm text-left">
						<thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
							<tr>
								<th scope="col" className="px-6 py-3">
									Team Member
								</th>
								<th scope="col" className="px-6 py-3">
									Hours This Week
								</th>
								<th scope="col" className="px-6 py-3">
									Projects
								</th>
								<th scope="col" className="px-6 py-3">
									Efficiency
								</th>
								<th scope="col" className="px-6 py-3">
									Status
								</th>
							</tr>
						</thead>
						<tbody>
							{TEAM_MEMBERS.map((member, index) => (
								<tr key={index} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
									<td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
										{member.name}
									</td>
									<td className="px-6 py-4">{member.hours}</td>
									<td className="px-6 py-4">{member.projects}</td>
									<td className="px-6 py-4">{member.efficiency}</td>
									<td className="px-6 py-4">
										<span
											className={`px-2 py-1 rounded-full text-xs font-medium ${
												member.status === 'Active'
													? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
													: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
											}`}
										>
											{member.status}
										</span>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
