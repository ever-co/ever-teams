import { formatDateString, secondsToTime } from '@app/helpers';
import { ITimerApps } from '@app/interfaces/timer/ITimerApp';
import { ProgressBar } from 'lib/components';
import React from 'react';

const AppVisitedItem = ({ app, totalMilliseconds }: { app: ITimerApps; totalMilliseconds: number }) => {
	const { h, m, s } = secondsToTime(+app.duration);
	const percent = ((+app.duration * 100) / totalMilliseconds).toFixed(2);
	return (
		<div className="hover:dark:bg-[#26272C] border dark:border-[#26272C] bg-gray-200 dark:bg-[#191a20] p-4 rounded-md flex justify-between apps-center my-2">
			<p className="text-lg flex-1">{app.title}</p>
			<p className="text-lg text-center 2xl:w-56 3xl:w-64">
				{formatDateString(new Date(app.date).toISOString())} - {app.time}
			</p>
			<div className="text-lg flex-1 flex justify-center gap-2 px-4">
				<p className="w-1/4 text-end">{percent}%</p>
				<ProgressBar progress={percent + '%'} width={`75%`} />
			</div>
			<p className="text-lg 2xl:w-52 3xl:w-64 text-end">{`${h}:${m}:${s}`}</p>
		</div>
	);
};

export default AppVisitedItem;
