import { useTimeDailyActivity } from '@app/hooks/features/useTimeDailyActivity';
import { ProgressBar } from 'lib/components';

export function AppsTab() {
	const { visitedApps, loading } = useTimeDailyActivity('APP');
	return (
		<div>
			<div className="flex justify-end w-full">{/* TODO: Filters components */}</div>
			<header className="bg-gray-200 dark:bg-[#26272C] rounded-md p-4 flex items-center justify-between">
				<h3 className="text-lg font-semibold w-1/4">Apps</h3>
				<h3 className="text-lg font-semibold w-1/4">Visited Dates</h3>
				<h3 className="text-lg font-semibold w-1/4">Percent used</h3>
				<h3 className="text-lg font-semibold w-1/4">Time spent (hours)</h3>
			</header>
			<section>
				{visitedApps?.map((app, i) => (
					<div
						key={i}
						className="hover:dark:bg-[#26272C] border dark:border-[#26272C] dark:bg-[#191a20] p-4 rounded-md flex justify-between items-center my-2"
					>
						<p className="text-lg w-1/4">{app.title}</p>
						<p className="text-lg w-1/4">
							{new Date(app.date).toISOString()} - {app.time}
						</p>
						<div className="text-lg w-1/4 flex gap-2 px-4">
							<p>{20}%</p>
							<ProgressBar progress={20} width={'80%'} />
						</div>
						<p className="text-lg w-1/4">{'00:10:00'}</p>
					</div>
				))}
			</section>
			{visitedApps?.length < 1 && !loading && (
				<div className="hover:dark:bg-[#26272C] border dark:border-[#26272C] dark:bg-[#191a20] p-4 rounded-md flex justify-center items-center my-2">
					<p className="text-lg text-center">There is no apps visited today</p>
				</div>
			)}
			{loading && visitedApps.length < 1 && (
				<div className="hover:dark:bg-[#26272C] border dark:border-[#26272C] dark:bg-[#191a20] p-4 py-6 animate-pulse rounded-md flex justify-center items-center my-2"></div>
			)}
		</div>
	);
}
