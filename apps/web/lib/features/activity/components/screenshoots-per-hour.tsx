import { IScreenShootItem } from '@app/interfaces/IScreenshoot';
import { ITimerSlot } from '@app/interfaces/timer/ITimerSlot';
import { clsxm } from '@app/utils';
import { ProgressBar } from 'lib/components';
import Image from 'next/image';

export const ScreenshootPerHour = ({
	timeSlots,
	startedAt,
	stoppedAt
}: {
	timeSlots: ITimerSlot[];
	startedAt: Date;
	stoppedAt: Date;
}) => {
	return (
		<div className="p-4 my-4 rounded-md dark:bg-[#1E2025] border-[0.125rem] dark:border-[#FFFFFF0D]">
			<h3>
				{startedAt.toLocaleString()} - {stoppedAt.toLocaleString()}
			</h3>
			<div className="flex justify-start items-start gap-4 my-4">
				{timeSlots.map((el, i) => (
					<div key={i} className={clsxm('xl:w-1/6')}>
						<ScreenShootItem
							endTime={el.stoppedAt}
							startTime={el.startedAt}
							percent={el.percentage}
							imageUrl={el.screenshoots[0].thumb}
						/>
					</div>
				))}
			</div>
		</div>
	);
};

const ScreenShootItem = ({ endTime, imageUrl, percent, startTime }: IScreenShootItem) => {
	return (
		<div
			className={clsxm(
				'rounded-lg shadow-md border dark:border-[#26272C] dark:bg-[#191a20] overflow-hidden h-56 w-full'
			)}
		>
			<div className="w-full h-1/2 object-cover bg-gray-200 dark:bg-[#26272C] relative">
				<Image src={imageUrl} alt={`screenshoot-${imageUrl}`} />
			</div>
			<div className="w-full h-1/2 p-4">
				<h4 className="font-semibold text-sm">
					{new Date(startTime).toLocaleString()} - {new Date(endTime).toLocaleString()}
				</h4>
				<p className="text-xs mb-6">{'Saturday, January 6, 2024 '}</p>
				<ProgressBar width={'100%'} progress={percent} className="my-2 w-full" />
				<p className="font-semibold text-sm">{percent} % of 10 Minutes</p>
			</div>
		</div>
	);
};
