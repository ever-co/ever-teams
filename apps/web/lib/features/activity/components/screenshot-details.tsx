'use client';

import React from 'react';
import { Modal, ProgressBar } from 'lib/components';
import { IScreenshot } from '@app/interfaces/timer/ITimerSlot';
import ScreenshotItem from './screenshot-item';
import { useTranslations } from 'next-intl';

const ScreenshotDetailsModal = ({
	open,
	closeModal,
	screenshots,
	percentage,
	endTime,
	startTime
}: {
	open: boolean;
	screenshots: IScreenshot[];
	closeModal: () => void;
	percentage: number;
	endTime: string | Date;
	startTime: string | Date;
}) => {
	const t = useTranslations();
	return (
		<Modal
			isOpen={open}
			title="Screenshots detail"
			closeModal={closeModal}
			className="bg-white dark:bg-[#343434d4] p-4 rounded-lg lg:w-[60vw] xl:w-[50vw] 2xl:w-[40vw] m-8"
		>
			<div className="w-full p-4">
				<h1 className="py-2 font-semibold text-lg">
					{new Date(startTime).toLocaleTimeString()} - {new Date(endTime).toLocaleTimeString()}
				</h1>
				<ProgressBar progress={percentage + '%'} width={'100%'} />
				<p className="font-semibold py-1">
					{percentage} {t('timer.PERCENT_OF_MINUTES')}
				</p>
				<div className="my-2 flex overflow-x-auto">
					{screenshots.map((screenshot, i) => (
						<div key={i} className="w-1/3 p-2">
							<ScreenshotItem
								endTime={endTime}
								startTime={screenshot.createdAt}
								imageUrl={screenshot.thumbUrl}
								percent={0}
								showProgress={false}
							/>
						</div>
					))}
				</div>
			</div>
		</Modal>
	);
};

export default ScreenshotDetailsModal;
