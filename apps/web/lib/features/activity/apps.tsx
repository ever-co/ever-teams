import { useTimeDailyActivity } from '@app/hooks/features/useTimeDailyActivity';
import { AppVisitedSkeletion } from './components/app-visited-skeleton';
import { groupAppsByHour } from '@app/helpers/array-data';
import AppVisitedItem from './components/app-visited-Item';

export function AppsTab() {
	const { visitedApps, loading } = useTimeDailyActivity('APP');
	const apps = groupAppsByHour(visitedApps);
	return (
		<div>
			<div className="flex justify-end w-full">{/* TODO: Filters components */}</div>
			<header className="bg-gray-200 dark:bg-[#26272C] rounded-md p-4 flex items-center justify-between">
				<h3 className="text-lg font-semibold w-1/4">Apps</h3>
				<h3 className="text-lg text-center font-semibold w-1/4">Visited Dates</h3>
				<h3 className="text-lg text-center font-semibold w-1/4">Percent used</h3>
				<h3 className="text-lg font-semibold w-1/4 text-end">Time spent (hours)</h3>
			</header>
			<section>
				{apps.map((app, i) => (
					<div key={i} className="border rounded-md my-4 p-4 dark:border-[#FFFFFF0D] dark:bg-[#1B1D22]">
						<h3>{app.hour}</h3>
						<div>
							{app.apps?.map((item, i) => (
								<div key={i} className="w-full">
									<AppVisitedItem app={item} totalMilliseconds={app.totalMilliseconds} />
								</div>
							))}
						</div>
					</div>
				))}
			</section>
			{visitedApps?.length < 1 && !loading && (
				<div className="hover:dark:bg-[#26272C] border dark:border-[#26272C] dark:bg-[#191a20] p-4 py-16 rounded-md flex justify-center items-center my-2">
					<p className="text-lg text-center">There is no Apps Visited today</p>
				</div>
			)}
			{loading && visitedApps.length < 1 && (
				<>
					<AppVisitedSkeletion />
					<AppVisitedSkeletion />
				</>
			)}
		</div>
	);
}
