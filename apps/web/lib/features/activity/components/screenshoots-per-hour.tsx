import { IScreenShootItem, IScreenshootPerHour } from '@app/interfaces/IScreenshoot';
import { clsxm } from '@app/utils';
import { ProgressBar } from 'lib/components';
import Image from 'next/image';

export const ScreenshootPerHour = ({ startTime, endTime }: IScreenshootPerHour) => {
	return (
		<div className="p-4 my-4 rounded-md dark:bg-[#1E2025] border-[0.125rem] dark:border-[#FFFFFF0D]">
			<h3>
				{startTime.toLocaleString()} - {endTime.toLocaleString()}
			</h3>
			<div className="flex justify-start items-start gap-4 my-4">
				{new Array(6)
					.fill({
						endTime: new Date(),
						imageUrl: '',
						percent: 83,
						startTime: new Date()
					})
					.map((el: IScreenShootItem, i) => (
						<div key={i} className={clsxm('xl:w-1/6')}>
							<ScreenShootItem
								endTime={el.endTime}
								startTime={el.startTime}
								percent={el.percent}
								imageUrl={el.imageUrl}
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
					{startTime.toLocaleString()} - {endTime.toLocaleString()}
				</h4>
				<p className="text-xs mb-6">{'Saturday, January 6, 2024 '}</p>
				<ProgressBar width={'100%'} progress={percent} className="my-2 w-full" />
				<p className="font-semibold text-sm">{percent} % of 10 Minutes</p>
			</div>
		</div>
	);
};
