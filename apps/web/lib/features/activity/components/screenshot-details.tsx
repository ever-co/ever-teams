'use client';

import { Modal, ProgressBar } from 'lib/components';
import { ITimerSlot } from '@app/interfaces/timer/ITimerSlot';
import ScreenshotItem from './screenshot-item';
import { useTranslations } from 'next-intl';
import React from 'react';

const ScreenshotDetailsModal = ({
	open,
	closeModal,
	slot
}: {
	open: boolean;
	closeModal: () => void;
	slot?: ITimerSlot | null;
}) => {
	const t = useTranslations();

	const timeInterval =
		slot?.startedAt &&
		slot?.stoppedAt &&
		`
			${new Date(slot?.startedAt).toLocaleTimeString('en-US', {
				hour: '2-digit',
				minute: '2-digit',
				hour12: false
			})}
			-
			${new Date(slot?.stoppedAt).toLocaleTimeString('en-US', {
				hour: '2-digit',
				minute: '2-digit',
				hour12: false
			})}
`;

	return (
		<Modal
			isOpen={open}
			closeModal={closeModal}
			className="bg-white dark:border-[#26272C] dark:bg-[#191a20] dark:border rounded-[1rem] h-[44rem] lg:w-[50rem]"
		>
			<div className="w-full h-full p-5 flex flex-col gap-5 overflow-x-auto">
				<div className="w-full flex flex-col gap-2">
					<h4 className="font-semibold space-x-2 text-lg">
						<span>
							{new Date(slot?.startedAt ?? '').toLocaleDateString('en-US', {
								weekday: 'long',
								year: 'numeric',
								month: 'long',
								day: 'numeric'
							})}
						</span>
						<span>{timeInterval}</span>
					</h4>
					<ProgressBar progress={slot ? `${slot.percentage}%` : '0%'} width={'100%'} />
					<span>{timeInterval}</span>
				</div>

				<div className="w-full flex flex-col gap-3">
					<h4 className=" font-medium text-lg">{t('common.SCREENSHOTS')}</h4>

					<div className="flex w-full gap-2 overflow-x-auto">
						{slot?.screenshots.map((screenshot, i) => (
							<div className="w-[12rem] space-y-2 shrink-0" key={i}>
								<ScreenshotItem
									viewMode="screenShot-only"
									idSlot={slot?.id}
									endTime={slot?.stoppedAt}
									startTime={screenshot.recordedAt}
									imageUrl={screenshot.thumbUrl}
									percent={0}
									showProgress={false}
									onShow={() => null}
								/>

								<p className=" font-light text-[.6rem] px-2 text-center">
									{new Date(slot?.startedAt ?? '').toLocaleDateString('en-US', {
										weekday: 'long',
										year: 'numeric',
										month: 'long',
										day: 'numeric'
									})}
									,{' '}
									{new Date(screenshot.recordedAt ?? '').toLocaleTimeString('en-US', {
										hour: '2-digit',
										minute: '2-digit',
										hour12: false
									})}
								</p>
							</div>
						))}
					</div>
				</div>

				<div className="w-full flex flex-col   gap-3">
					<h4 className=" font-medium text-lg">{t('common.TIME_LOG')}</h4>

					<div className="w-full bg-[#E9E9E9] dark:bg-[#e9e9e90b] p-4 rounded-lg flex-col flex gap-3">
						{/* Source */}
						<div className="w-full flex flex-col gap-2">
							<p className="text-[#707070] font-medium">{t('common.SOURCE')} : </p>
							<div className="flex gap-1 ">
								<div className="px-3 py-1  text-xs font-medium bg-[#4B2EFF] text-white rounded-sm">
									Desktop
								</div>
								<div className="px-3 py-1  text-xs font-medium text-white rounded-sm bg-[#A5A4FF]">
									v.2.3.4
								</div>
							</div>
						</div>

						{/* Client */}
						<div className="w-full flex flex-col gap-2">
							<p className="text-[#707070] font-medium">{t('common.CLIENT')} : </p>
							<div className="flex gap-1 ">
								<div className="px-3 py-1  text-xs font-medium bg-[#FFA39D] text-white rounded-sm">
									No client
								</div>
							</div>
						</div>

						{/* Project */}
						<div className="w-full flex flex-col gap-2">
							<p className="text-[#707070] font-medium">{t('pages.taskDetails.PROJECT')} : </p>
							<div className="flex gap-1 ">
								<div className="flex h-8 gap-2">
									<div className=" w-8  h-full uppercase  rounded-sm flex items-center justify-center text-[1rem] bg-[#A5A4FF]">
										ET
									</div>
									<div className=" h-full flex flex-col  justify-center gap-[.4rem]">
										<p className=" font-xs leading-3 font-medium">Ever Teams</p>
										<p className=" text-[.6rem] leading-[.5rem]">Members count : 23</p>
									</div>
								</div>
							</div>
						</div>

						{/* To do */}
						<div className="w-full flex flex-col gap-2">
							<p className="text-[#707070] font-medium">To do : </p>
							<div className="flex gap-1 ">No To do</div>
						</div>
					</div>
				</div>
			</div>
		</Modal>
	);
};

export default React.memo(ScreenshotDetailsModal);
