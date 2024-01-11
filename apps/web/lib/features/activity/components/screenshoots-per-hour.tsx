import { IScreenShootItem } from '@app/interfaces/IScreenshoot';
import { ITimerSlot } from '@app/interfaces/timer/ITimerSlot';
import { clsxm } from '@app/utils';
import { ProgressBar } from 'lib/components';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

export const ScreenshootPerHour = ({
	timeSlots,
	startedAt,
	stoppedAt
}: {
	timeSlots: ITimerSlot[];
	startedAt: string;
	stoppedAt: string;
}) => {
	return (
		<div className="p-4 my-4 rounded-md dark:bg-[#1E2025] border-[0.125rem] dark:border-[#FFFFFF0D]">
			<h3 className="px-4">
				{startedAt} - {stoppedAt}
			</h3>
			<div className="flex justify-start items-start flex-wrap ">
				{timeSlots.map((el, i) => (
					<div key={i} className={clsxm('min-w-[20rem] xl:w-1/6 p-4')}>
						<ScreenShootItem
							endTime={el.stoppedAt}
							startTime={el.startedAt}
							percent={el.percentage}
							imageUrl={el.screenshots[0]?.thumbUrl}
						/>
					</div>
				))}
			</div>
		</div>
	);
};

const ScreenShootItem = ({ endTime, imageUrl, percent, startTime }: IScreenShootItem) => {
	const t = useTranslations();
	return (
		<div
			className={clsxm(
				'rounded-lg shadow-md hover:shadow-lg cursor-pointer border dark:border-[#26272C] dark:bg-[#191a20] overflow-hidden h-56 w-full'
			)}
		>
			<div className="w-full h-1/2 object-cover bg-gray-200 dark:bg-[#26272C] relative">
				<Image
					src={imageUrl}
					alt={`screenshoot-${imageUrl}`}
					width={400}
					height={400}
					className="w-full h-full"
				/>
			</div>
			<div className="w-full h-1/2 p-4">
				<h4 className="font-semibold text-xs">
					{new Date(startTime).toLocaleTimeString()} - {new Date(endTime).toLocaleTimeString()}
				</h4>
				<p className="text-xs mb-6">
					{new Date(startTime).toLocaleDateString('en-US', {
						weekday: 'long',
						month: 'long',
						day: 'numeric',
						year: 'numeric'
					})}
				</p>
				<ProgressBar width={'100%'} progress={`${percent}%`} className="my-2 w-full" />
				<p className="font-semibold text-sm">
					{percent} {t('timer.PERCENT_OF_MINUTES')}
				</p>
			</div>
		</div>
	);
};
