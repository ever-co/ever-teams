import { useModal } from '@app/hooks';
import { useTimeSlots } from '@app/hooks/features/useTimeSlot';
import { IScreenShootItem } from '@app/interfaces/IScreenshoot';
import { clsxm } from '@app/utils';
import { Button, Modal, ProgressBar } from 'lib/components';
import { TrashIcon } from 'lib/components/svgs';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import React from 'react';

const ScreenshotItem = ({
	idSlot,
	endTime,
	imageUrl,
	percent,
	startTime,
	showProgress = true,
	onShow
}: IScreenShootItem) => {
	const t = useTranslations();
	const { deleteTimeSlots } = useTimeSlots();
	const { isOpen, openModal, closeModal } = useModal();
	return (
		<div
			className={clsxm(
				'rounded-lg shadow-md hover:shadow-lg  border dark:border-[#26272C] dark:bg-[#191a20] overflow-hidden h-56 w-full',
				!showProgress && '!h-48 dark:!bg-[#191a20]'
			)}
		>
			<div
				className={clsxm(
					'w-full h-1/2 object-cover bg-gray-200 dark:bg-[#26272C] relative',
					!showProgress && '!h-2/3'
				)}
			>
				<div
					className="rounded-full bg-red-200 top-1 right-1 absolute w-8 h-8 flex justify-center items-center text-center cursor-pointer"
					onClick={() => openModal()}
				>
					<TrashIcon className="text-white text-center" />
				</div>
				<Image
					src={imageUrl}
					alt={`${new Date(startTime).toLocaleTimeString()} - ${new Date(endTime).toLocaleTimeString()}`}
					width={400}
					height={400}
					className="w-full h-full"
				/>
			</div>
			<div className={clsxm('w-full h-1/2 p-4 cursor-pointer', !showProgress && '!h-1/3')} onClick={onShow}>
				{showProgress ? (
					<>
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
					</>
				) : (
					<div className="dark:text-gray-200">
						<p className="text-sm text-center">
							{new Date(startTime).toLocaleDateString('en-US', {
								weekday: 'long',
								month: 'long',
								day: 'numeric',
								year: 'numeric'
							})}
						</p>
						<p className="text-sm text-center">{new Date(startTime).toLocaleTimeString()}</p>
					</div>
				)}
			</div>
			<Modal
				isOpen={isOpen}
				closeModal={closeModal}
				className="bg-white dark:bg-[#343434f4] p-4 rounded-lg lg:w-[30vw] xl:w-[30vw] m-8"
			>
				<div>
					<p className="py-4 text-center">Are you sure to delete this slot ?</p>
					<div className="flex gap-2">
						<Button onClick={closeModal}>Cancel</Button>
						<Button onClick={() => deleteTimeSlots([idSlot])} className="bg-red-500 dark:bg-red-600">
							Delete
						</Button>
					</div>
				</div>
			</Modal>
		</div>
	);
};

export default ScreenshotItem;
