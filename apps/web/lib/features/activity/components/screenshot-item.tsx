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
	showProgress = true,
	onShow,
	isTeamPage = false
}: IScreenShootItem) => {
	const t = useTranslations();
	const { deleteTimeSlots } = useTimeSlots();
	const { isOpen, openModal, closeModal } = useModal();
	return (
		<div
			className={clsxm(
				'rounded-[1.5rem] bg-white cursor-pointer max-w-[14rem] border-2 hover:border-transparent  dark:border-[#26272C] dark:bg-[#191a20] overflow-hidden h-[16rem] w-full',
				!showProgress && !isTeamPage && '!h-48 dark:!bg-[#191a20]',
				isTeamPage && '!h-32'
			)}
		>
			<div
				className={clsxm(
					'w-full group h-[60%] bg-gray-200 overflow-hidden dark:bg-[#26272C] relative',
					!showProgress && '!h-2/3'
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

						<div className="w-full flex py-4 items-center h-auto justify-center gap-4 flex-col">
							<button className="w-32 h-8 text-xs  rounded-full text-center bg-[#6E49E8] text-white">
								View
							</button>
							<button className="w-32 h-8 text-xs  rounded-full text-center bg-white">View info</button>
						</div>
					</div>
				</div>
			</div>
			<div className={clsxm('w-full h-[40%] p-4 dark:bg-[#191a20]', !showProgress && '!h-1/3')} onClick={onShow}>
				{showProgress ? (
					<>
						<h4 className="font-semibold text-xs">
							{new Date(startTime).toLocaleTimeString('en-US', {
								hour: '2-digit',
								minute: '2-digit',
								hour12: false
							})}
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
