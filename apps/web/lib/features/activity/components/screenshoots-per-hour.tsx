'use client';

import { ITimerSlot } from '@app/interfaces/timer/ITimerSlot';
import { clsxm } from '@app/utils';
import ScreenshotDetailsModal from './screenshot-details';
import { useModal } from '@app/hooks';
import ScreenshotItem from './screenshot-item';
import React, { useCallback } from 'react';

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
	const [selectedElement, setSelectedElement] = React.useState<ITimerSlot | null>(null);

	const openScreenModal = useCallback(
		(el: ITimerSlot) => {
			setSelectedElement(el);
			openModal();
		},
		[openModal]
	);
	return (
		<div className="p-5 my-4 rounded-[1rem] space-y-5 dark:bg-[#1E2025] border-[.2rem] dark:border-[#FFFFFF0D] border-[#B993E6] ">
			<h3 className=" font-medium">
				{startedAt} - {stoppedAt}
			</h3>
			<div className="flex gap-5 flex-wrap ">
				{timeSlots.map((el, i) => (
					<ScreenshotItem
						key={i}
						endTime={el.stoppedAt}
						startTime={el.startedAt}
						percent={el.percentage}
						imageUrl={el.screenshots[0]?.thumbUrl}
						onShow={() => openScreenModal(el)}
						idSlot={el.id}
					/>
				))}
				<ScreenshotDetailsModal open={isOpen} closeModal={closeModal} slot={selectedElement} />
			</div>
		</div>
	);
};

export const ScreenshootPerHourTeam = ({
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
		<div className="p-4 my-4 rounded-md dark:bg-[#1E2025] border-[0.125rem] bg-light--theme dark:border-[#FFFFFF0D]">
			<h3 className="px-4">
				{startedAt} - {stoppedAt}
			</h3>
			<div className="flex justify-start items-start flex-wrap ">
				{timeSlots.map((el, i) => (
					<div key={i} className={clsxm('min-w-[15rem] xl:w-1/6 p-4')}>
						<ScreenshotItem
							endTime={el.stoppedAt}
							startTime={el.startedAt}
							percent={el.percentage}
							imageUrl={el.screenshots[0]?.thumbUrl}
							onShow={() => openModal()}
							idSlot={el.id}
							isTeamPage
						/>
						<ScreenshotDetailsModal open={isOpen} closeModal={closeModal} slot={el} />
					</div>
				))}
			</div>
		</div>
	);
};
