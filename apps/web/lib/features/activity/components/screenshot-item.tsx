import { useModal } from '@app/hooks';
import { useTimeSlots } from '@app/hooks/features/useTimeSlot';
import { IScreenShootItem } from '@app/interfaces/IScreenshoot';
import { clsxm } from '@app/utils';
import { Button, Modal, ProgressBar } from 'lib/components';
import { TrashIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import React from 'react';

const ScreenshotItem = ({
	idSlot,
	endTime,
	imageUrl,
	percent,
	startTime,
	viewMode = 'default',
	onShow,
	isTeamPage = false
}: IScreenShootItem) => {
	const t = useTranslations();
	const { deleteTimeSlots } = useTimeSlots();
	const { isOpen, openModal, closeModal } = useModal();
	return (
		<div
			className={clsxm(
				'rounded-[1.5rem] shrink-0 bg-white cursor-pointer max-w-[14rem] border-2 hover:border-transparent  dark:border-[#26272C] dark:bg-[#191a20] overflow-hidden h-[16rem] max-h-[16rem] w-full',
				isTeamPage && '!h-32',
				viewMode === 'screenShot-only' && 'h-[10rem]'
			)}
		>
			<div
				className={clsxm(
					'w-full group h-[60%] bg-gray-200 overflow-hidden dark:bg-[#26272C] relative',
					viewMode === 'screenShot-only' && 'h-full'
				)}
			>
				<Image
					src={imageUrl}
					alt={`${new Date(startTime).toLocaleTimeString()} - ${new Date(endTime).toLocaleTimeString()}`}
					width={400}
					height={400}
					className="w-full h-full object-cover"
				/>
				<div className=" group-hover:absolute w-full group-hover:top-[0%] transition-all left-0 h-full bg-[rgba(1,2,4,.4)] top-full ">
					<div className="w-full h-full flex items-end relative">
						<div
							className="rounded-full bg-red-700 z-10 top-3 right-3 absolute w-8 h-8 flex justify-center items-center text-center "
							onClick={() => openModal()}
						>
							<TrashIcon className="text-white text-center w-3" />
						</div>

						{viewMode === 'screenShot-only' ? null : (
							<div className="w-full flex py-4 items-center h-auto justify-center gap-4 flex-col">
								<button className="w-32 h-8 text-xs  rounded-full text-center bg-[#6E49E8]  text-white">
									{t('common.VIEW')}
								</button>
								<button
									onClick={onShow}
									className="w-32 h-8 text-xs  rounded-full text-black text-center bg-white"
								>
									{t('common.VIEW_INFO')}
								</button>
							</div>
						)}
					</div>
				</div>
			</div>
			<div className={clsxm('w-full h-[40%] p-4 dark:bg-[#191a20]')} onClick={onShow}>
				<>
					<h4 className="font-semibold text-xs">
						{new Date(startTime).toLocaleTimeString('en-US', {
							hour: '2-digit',
							minute: '2-digit',
							hour12: false
						})}{' '}
						-{' '}
						{new Date(endTime).toLocaleTimeString('en-US', {
							hour: '2-digit',
							minute: '2-digit',
							hour12: false
						})}
					</h4>
					<div className="space-y-1">
						<p className="text-[.6rem]">
							{new Date(startTime).toLocaleDateString('en-US', {
								weekday: 'long',
								month: 'long',
								day: 'numeric',
								year: 'numeric'
							})}
						</p>
						<ProgressBar width={'100%'} progress={`${percent}%`} className=" w-full" />
						<p className="text-[.6rem] font-medium">
							{Number(percent).toPrecision(3)} {t('timer.PERCENT_OF_MINUTES')}
						</p>
					</div>
				</>
			</div>
			<Modal
				isOpen={isOpen}
				closeModal={closeModal}
				className="bg-white dark:bg-[#343434f4] rounded-lg lg:w-[30vw] xl:w-[30vw]"
			>
				<div className="w-full h-full p-6 flex justify-center flex-col items-center gap-6">
					<p className=" text-center">{t('timeSlot.DELETE_MESSAGE')}</p>
					<div className="flex gap-2">
						<Button onClick={closeModal}>{t('common.CANCEL')}</Button>
						<Button onClick={() => deleteTimeSlots([idSlot])} className="bg-red-500 dark:bg-red-600">
							{t('common.DELETE')}
						</Button>
					</div>
				</div>
			</Modal>
		</div>
	);
};

export default ScreenshotItem;
