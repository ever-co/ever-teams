import { ITimerSlot } from '@app/interfaces/timer/ITimerSlot';
import { clsxm } from '@app/utils';
import ScreenshotDetailsModal from './screenshot-details';
import { useModal } from '@app/hooks';
import ScreenshotItem from './screenshot-item';

export const ScreenshootPerHour = ({
	timeSlots,
	startedAt,
	stoppedAt
}: {
	timeSlots: ITimerSlot[];
	startedAt: string;
	stoppedAt: string;
}) => {
	const { isOpen, closeModal, openModal } = useModal();
	return (
		<div className="p-4 my-4 rounded-md dark:bg-[#1E2025] border-[0.125rem] dark:border-[#FFFFFF0D]">
			<h3 className="px-4">
				{startedAt} - {stoppedAt}
			</h3>
			<div className="flex justify-start items-start flex-wrap ">
				{timeSlots.map((el, i) => (
					<div key={i} className={clsxm('min-w-[20rem] xl:w-1/6 p-4')}>
						<ScreenshotItem
							endTime={el.stoppedAt}
							startTime={el.startedAt}
							percent={el.percentage}
							imageUrl={el.screenshots[0]?.thumbUrl}
							onShow={() => openModal()}
							idSlot={el.id}
						/>
						<ScreenshotDetailsModal open={isOpen} closeModal={closeModal} slot={el} />
					</div>
				))}
			</div>
		</div>
	);
};
