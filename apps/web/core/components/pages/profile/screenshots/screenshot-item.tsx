import { useModal } from '@/core/hooks';
import { useTimeSlots } from '@/core/hooks/activities/use-time-slots';
import { IScreenShootItem } from '@/core/types/interfaces/timer/screenshoot/screenshoot';
import { clsxm } from '@/core/lib/utils';
import { Button, Modal } from '@/core/components';
import { TrashIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { ProgressBar } from '@/core/components/duplicated-components/_progress-bar';

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
					src={imageUrl || '/assets/jpeg/placeholder-image.jpeg'}
					alt={`${new Date(startTime).toLocaleTimeString()} - ${new Date(endTime).toLocaleTimeString()}`}
					width={400}
					height={400}
					className="object-cover w-full h-full"
					onError={(e) => {
						console.error('Image failed to load:', imageUrl);
						e.currentTarget.src = '/assets/jpeg/placeholder-image.jpeg';
					}}
				/>
				<div className=" group-hover:absolute w-full group-hover:top-[0%] transition-all left-0 h-full bg-[rgba(1,2,4,.4)] top-full ">
					<div className="relative flex items-end w-full h-full">
						<div
							className="absolute z-10 flex items-center justify-center w-8 h-8 text-center bg-red-700 rounded-full top-3 right-3 "
							onClick={() => openModal()}
						>
							<TrashIcon className="w-3 text-center text-white" />
						</div>

						{viewMode === 'screenShot-only' ? null : (
							<div className="flex flex-col items-center justify-center w-full h-auto gap-4 py-4">
								<button className="w-32 h-8 text-xs  rounded-full text-center bg-[#6E49E8]  text-white">
									{t('common.VIEW')}
								</button>
								<button
									onClick={onShow}
									className="w-32 h-8 text-xs text-center text-black bg-white rounded-full"
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
					<h4 className="text-xs font-semibold">
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
						<ProgressBar width={'100%'} progress={`${percent}%`} className="w-full " />
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
				<div className="flex flex-col items-center justify-center w-full h-full gap-6 p-6">
					<p className="text-center ">{t('timeSlot.DELETE_MESSAGE')}</p>
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
