import { ProgressBar } from 'lib/components';
import { ScreenshootPerHour } from './components/screenshoots-per-hour';
import { clsxm } from '@app/utils';

export function ScreenshootTab() {
	const activityPercent = 65;
	const hourPercent = 46;
	const totaHours = '1:20:34';
	return (
		<div>
			<div className="flex items-center gap-4">
				{/* Stats cards */}
				<div className="shadow rounded-md sm:w-1/2 lg:w-1/3 xl:w-1/4 p-4 h-32 bg-white dark:bg-[#26272C]">
					<span>Activity</span>
					<h2 className="text-3xl font-bold my-3">{activityPercent} %</h2>
					<ProgressBar width={'80%'} progress={activityPercent} className="my-2" />
				</div>
				<div className="shadow rounded-md sm:w-1/2 lg:w-1/3 xl:w-1/4 p-4 h-32 bg-white dark:bg-[#26272C]">
					<span>Total Hours</span>
					<h2 className="text-3xl font-bold my-3">{totaHours}</h2>
					<ProgressBar
						width={'80%'}
						progress={hourPercent}
						className={clsxm('my-2', hourPercent < 50 ? 'bg-red-500' : null)}
					/>
				</div>
			</div>
			<ScreenshootPerHour startTime={new Date()} endTime={new Date()} />
			<ScreenshootPerHour startTime={new Date()} endTime={new Date()} />
			<ScreenshootPerHour startTime={new Date()} endTime={new Date()} />
		</div>
	);
}
