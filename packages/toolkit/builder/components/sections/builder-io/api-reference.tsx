import { cn } from '@ever-teams/toolkit-ui';

export const ApiReference = () => (
	<div className="mb-32 text-slate-900 dark:text-slate-100">
		<h2 className="text-4xl font-bold mb-8">API Reference</h2>
		<div className="space-y-8">
			<div>
				<h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">Timer Components</h3>
				<div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
					<table className="w-full border-collapse bg-white dark:bg-slate-900">
						<thead>
							<tr className="bg-slate-50 dark:bg-slate-800">
								<th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
									Component
								</th>
								<th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
									Input
								</th>
								<th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
									Type
								</th>
								<th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
									Description
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-200 dark:divide-slate-700">
							<tr>
								<td
									rowSpan={4}
									className="p-4 border-b border-slate-200 dark:border-slate-700 align-top bg-white dark:bg-slate-900"
								>
									TeamsModernTimer
								</td>
								<td className="p-4 border-b border-slate-200 dark:border-slate-700">variant</td>
								<td className="p-4 border-b border-slate-200 dark:border-slate-700">string</td>
								<td className="p-4 border-b border-slate-200 dark:border-slate-700">
									Timer variant (&apos;default&apos;, &apos;bordered&apos;)
								</td>
							</tr>
							<tr>
								<td className="p-4 border-b border-slate-200 dark:border-slate-700">size</td>
								<td className="p-4 border-b border-slate-200 dark:border-slate-700">string</td>
								<td className="p-4 border-b border-slate-200 dark:border-slate-700">
									Timer size (&apos;sm&apos;, &apos;default&apos;, &apos;lg&apos;)
								</td>
							</tr>
							<tr>
								<td className="p-4 border-b border-slate-200 dark:border-slate-700">showProgress</td>
								<td className="p-4 border-b border-slate-200 dark:border-slate-700">boolean</td>
								<td className="p-4 border-b border-slate-200 dark:border-slate-700">
									Show/hide progress indicator
								</td>
							</tr>
							<tr>
								<td className="p-4 border-b border-slate-200 dark:border-slate-700">expandable</td>
								<td className="p-4 border-b border-slate-200 dark:border-slate-700">boolean</td>
								<td className="p-4 border-b border-slate-200 dark:border-slate-700">
									Whether the component can be expanded
								</td>
							</tr>

							<tr>
								<td
									rowSpan={3}
									className="p-4 border-b border-slate-200 dark:border-slate-700 align-top bg-white dark:bg-slate-900"
								>
									TeamsProgress
								</td>
								<td className="p-4 border-b border-slate-200 dark:border-slate-700">progress</td>
								<td className="p-4 border-b border-slate-200 dark:border-slate-700">boolean</td>
								<td className="p-4 border-b border-slate-200 dark:border-slate-700">
									Enable progress tracking
								</td>
							</tr>
							<tr>
								<td className="p-4 border-b border-slate-200 dark:border-slate-700">icon</td>
								<td className="p-4 border-b border-slate-200 dark:border-slate-700">boolean</td>
								<td className="p-4 border-b border-slate-200 dark:border-slate-700">
									Show/hide progress icon
								</td>
							</tr>
							<tr>
								<td className="p-4 border-b border-slate-200 dark:border-slate-700">background</td>
								<td className="p-4 border-b border-slate-200 dark:border-slate-700">string</td>
								<td className="p-4 border-b border-slate-200 dark:border-slate-700">
									Background style (&apos;none&apos;, &apos;primary&apos;, &apos;secondary&apos;)
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>

			<div>
				<h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">Chart Components</h3>
				<div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
					<table className="w-full border-collapse bg-white dark:bg-slate-900">
						<thead>
							<tr className="bg-slate-50 dark:bg-slate-800">
								<th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
									Component
								</th>
								<th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
									Input
								</th>
								<th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
									Type
								</th>
								<th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
									Description
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-200 dark:divide-slate-700">
							<tr>
								<td
									rowSpan={4}
									className="p-4 border-b border-slate-200 dark:border-slate-700 align-top bg-white dark:bg-slate-900"
								>
									BasicLineChart
								</td>
								<td className="p-4 border-b border-slate-200 dark:border-slate-700">data</td>
								<td className="p-4 border-b border-slate-200 dark:border-slate-700">array</td>
								<td className="p-4 border-b border-slate-200 dark:border-slate-700">
									Array of data points for the chart
								</td>
							</tr>
							<tr>
								<td className="p-4 border-b border-slate-200 dark:border-slate-700">title</td>
								<td className="p-4 border-b border-slate-200 dark:border-slate-700">string</td>
								<td className="p-4 border-b border-slate-200 dark:border-slate-700">Chart title</td>
							</tr>
							<tr>
								<td className="p-4 border-b border-slate-200 dark:border-slate-700">description</td>
								<td className="p-4 border-b border-slate-200 dark:border-slate-700">string</td>
								<td className="p-4 border-b border-slate-200 dark:border-slate-700">
									Chart description
								</td>
							</tr>
							<tr>
								<td className="p-4 border-b border-slate-200 dark:border-slate-700">draggable</td>
								<td className="p-4 border-b border-slate-200 dark:border-slate-700">boolean</td>
								<td className="p-4 border-b border-slate-200 dark:border-slate-700">
									Enable drag interaction
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</div>
);
