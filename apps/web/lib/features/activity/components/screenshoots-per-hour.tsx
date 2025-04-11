'use client';

import { ITimerSlot } from '@app/interfaces/timer/ITimerSlot';
import { clsxm } from '@app/utils';
import ScreenshotDetailsModal from './screenshot-details';
import { useModal } from '@app/hooks';
import ScreenshotItem from './screenshot-item';
import React, { useCallback } from 'react';

export const ScreenshotPerHour = ({
	timeSlots,
	startedAt,
	stoppedAt,
	isTeamPage = false
}: {
	timeSlots: ITimerSlot[];
	startedAt: string;
	stoppedAt: string;
	isTeamPage?: boolean;
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

	const containerClasses = isTeamPage
		? "p-4 my-4 rounded-md dark:bg-[#1E2025] border-[0.125rem] bg-light--theme dark:border-[#FFFFFF0D]"
		: "p-5 my-4 rounded-[1rem] space-y-5 dark:bg-[#1E2025] border-[.2rem] dark:border-[#FFFFFF0D] border-[#B993E6]";

	const headingClasses = isTeamPage ? "px-4" : "font-medium";

	const contentClasses = isTeamPage
		? "flex justify-start items-start flex-wrap"
		: "flex gap-5 flex-wrap";

	return (
		<div className={containerClasses}>
			<h3 className={headingClasses}>
				{startedAt} - {stoppedAt}
			</h3>
			<div className={contentClasses}>
				{timeSlots.map((el, i) => {
					if (isTeamPage) {
						return (
							<div key={i} className={clsxm('min-w-[15rem] xl:w-1/6 p-4')}>
								<ScreenshotItem
									endTime={el.stoppedAt}
									startTime={el.startedAt}
									percent={el.percentage}
									imageUrl={el.screenshots[0]?.thumbUrl}
									onShow={() => openScreenModal(el)}
									idSlot={el.id}
									isTeamPage
								/>
							</div>
						);
					}

					return (
						<ScreenshotItem
							key={i}
							endTime={el.stoppedAt}
							startTime={el.startedAt}
							percent={el.percentage}
							imageUrl={el.screenshots[0]?.thumbUrl}
							onShow={() => openScreenModal(el)}
							idSlot={el.id}
						/>
					);
				})}
				<ScreenshotDetailsModal
					open={isOpen}
					closeModal={closeModal}
					slot={selectedElement}
				/>
			</div>
		</div>
	);
};

export const ScreenshotPerHourTeam = (props: {
	timeSlots: ITimerSlot[];
	startedAt: string;
	stoppedAt: string;
}) => {
	return <ScreenshotPerHour {...props} isTeamPage={true} />;
};
