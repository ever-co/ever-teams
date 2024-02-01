'use client';

import React from 'react';
import { Modal, ProgressBar, Tooltip } from 'lib/components';
import { ITimerSlot } from '@app/interfaces/timer/ITimerSlot';
import ScreenshotItem from './screenshot-item';
import { useTranslations } from 'next-intl';

const ScreenshotDetailsModal = ({
	open,
	closeModal,
	slot
}: {
	open: boolean;
	closeModal: () => void;
	slot: ITimerSlot;
}) => {
	const t = useTranslations();
	return (
		<Modal
			isOpen={open}
			title="Screenshots detail"
			closeModal={closeModal}
			className="bg-white dark:bg-[#343434d4] p-4 rounded-lg lg:w-[60vw] xl:w-[50vw] 2xl:w-[40vw] m-8"
		>
			<div className="w-full p-4 overflow-x-scroll">
				<h1 className="py-2 font-semibold text-lg">
					{new Date(slot.startedAt).toLocaleTimeString()} - {new Date(slot.stoppedAt).toLocaleTimeString()}
				</h1>
				<ProgressBar progress={slot.percentage + '%'} width={'100%'} />
				<p className="font-semibold py-1">
					{slot.percentage} {t('timer.PERCENT_OF_MINUTES')}
				</p>
				<div className="my-2 flex w-full overflow-x-auto">
					{slot.screenshots.map((screenshot, i) => (
						<div key={i} className="w-1/3 min-w-[20rem] p-2">
							<Tooltip
								label={screenshot.description}
								placement="left-start"
								type="VERTICAL"
								labelContainerClassName="w-full"
							>
								<ScreenshotItem
									idSlot={slot.id}
									endTime={slot.stoppedAt}
									startTime={screenshot.recordedAt}
									imageUrl={screenshot.thumbUrl}
									percent={0}
									showProgress={false}
									onShow={() => null}
								/>
							</Tooltip>
							<div className="bg-gray-100 dark:dark:bg-[#26272C] rounded-b-lg p-2">
								<h5>Source</h5>
								<div className="my-1 flex gap-1 flex-wrap">
									{screenshot.apps?.map((app, i) => (
										<span key={i} className="rounded-lg px-1 mb-1 text-white bg-blue-600">
											{app}
										</span>
									))}
								</div>
							</div>
						</div>
					))}
				</div>
				<div>
					<h4 className="text-lg font-semibold">{t('timer.OTHER_DETAILS')}</h4>
					<div className="flex gap-2">
						<p>
							<span className="font-semibold mx-2">{t('timer.KEYBOARD')}</span>
							<span>
								{t('timer.TIMES')} : {slot.keyboard} {slot.keyboardPercentage}%
							</span>
						</p>
						<p>
							<span className="font-semibold mx-2">{t('timer.MOUSE')}</span>
							<span>
								{t('timer.TIMES')} : {slot.mouse} {slot.mousePercentage}%
							</span>
						</p>
						<p className="rounded-lg px-1 mb-1 text-white ">
							{slot.isActive ? (
								<span className=" bg-green-600 rounded-lg px-2 m-1">{t('timer.ACTIVE')}</span>
							) : (
								<span className=" bg-red-600 rounded-lg px-2 m-1">{t('timer.INACTIVE')}</span>
							)}
						</p>
						<p>
							{slot.isArchived ? (
								<span className=" bg-gray-600 rounded-lg px-2 m-1">{t('timer.ARCHIVED')}</span>
							) : (
								<span className=" bg-blue-600 rounded-lg px-2 m-1">{t('timer.NOT_ARCHIVED')}</span>
							)}
						</p>
					</div>
				</div>
			</div>
		</Modal>
	);
};

export default ScreenshotDetailsModal;
