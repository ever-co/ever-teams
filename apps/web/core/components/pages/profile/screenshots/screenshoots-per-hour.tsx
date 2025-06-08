'use client';
import { clsxm } from '@/core/lib/utils';
import ScreenshotDetailsModal from './screenshot-details';
import { useModal } from '@/core/hooks';
import ScreenshotItem from './screenshot-item';
import React, { useCallback, useEffect } from 'react';
import { TTimeSlot } from '@/core/types/schemas';

export const ScreenshotPerHour = ({
	timeSlots,
	startedAt,
	stoppedAt,
	isTeamPage = false
}: {
	timeSlots: TTimeSlot[];
	startedAt: string;
	stoppedAt: string;
	isTeamPage?: boolean;
}) => {
	const { isOpen, closeModal, openModal } = useModal();
	const [selectedElement, setSelectedElement] = React.useState<TTimeSlot | null>(null);

	const openScreenModal = useCallback(
		(el: TTimeSlot) => {
			setSelectedElement(el);
			openModal();
		},
		[openModal]
	);

	useEffect(() => {
		if (timeSlots && timeSlots.length > 0) {
			console.log('First slot screenshots:', timeSlots[0]?.screenshots);
		}
	}, [timeSlots]);

	const containerClasses = isTeamPage
		? 'p-4 my-4 rounded-md dark:bg-[#1E2025] border-[0.125rem] bg-light--theme dark:border-[#FFFFFF0D]'
		: 'p-5 my-4 rounded-[1rem] space-y-5 dark:bg-[#1E2025] border-[.2rem] dark:border-[#FFFFFF0D] border-[#B993E6]';

	const headingClasses = isTeamPage ? 'px-4' : 'font-medium';

	const contentClasses = isTeamPage ? 'flex justify-start items-start flex-wrap' : 'flex gap-5 flex-wrap';

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
									endTime={el.stoppedAt || ''}
									startTime={el.startedAt || ''}
									percent={el.percentage || 0}
									imageUrl={
										(el.screenshots && el.screenshots[0]?.thumbUrl) ||
										'/assets/jpeg/placeholder-image.jpeg'
									}
									onShow={() => openScreenModal(el)}
									idSlot={el.id}
									isTeamPage={isTeamPage}
								/>
							</div>
						);
					}

					return (
						<ScreenshotItem
							key={i}
							endTime={el.stoppedAt || ''}
							startTime={el.startedAt || ''}
							percent={el.percentage || 0}
							imageUrl={
								(el.screenshots && el.screenshots[0]?.thumbUrl) || '/assets/jpeg/placeholder-image.jpeg'
							}
							onShow={() => openScreenModal(el)}
							idSlot={el.id}
							isTeamPage={isTeamPage}
						/>
					);
				})}
				<ScreenshotDetailsModal open={isOpen} closeModal={closeModal} slot={selectedElement} />
			</div>
		</div>
	);
};

export const ScreenshotPerHourTeam = (props: { timeSlots: TTimeSlot[]; startedAt: string; stoppedAt: string }) => {
	return <ScreenshotPerHour {...props} isTeamPage={true} />;
};
