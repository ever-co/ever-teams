import { Card } from 'lib/components';
import { useState } from 'react';
// import ToolButton from '@components/pages/task/description-block/tool-button';
import { ChevronUpIcon } from '@heroicons/react/20/solid';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

const CompletionBlock = () => {
	const [isUpdated, setIsUpdated] = useState<boolean>(false);
	const t = useTranslations();
	return (
		<Card className="w-full mt-8" shadow="bigger">
			<div className="flex justify-between">
				<h4 className="pb-2 text-lg font-semibold">{t('pages.settingsTeam.PROOF_OF_COMPLETION')}</h4>

				<div className="flex items-center">
					<button className="flex items-center justify-center text-[#B1AEBC] text-sm mr-2">
						<Image className="mr-1" width={22} height={22} alt="bold" src="/assets/svg/link2.svg" />{' '}
						{t('common.LINK')}
					</button>
					{/* <ToolButton iconSource="/assets/svg/attach.svg" />
					<ToolButton iconSource="/assets/svg/more.svg" /> */}
					<Image src="/assets/svg/line-up.svg" alt="line" width={18} height={18} style={{ height: '18px' }} />
					<ChevronUpIcon className="h-5 w-5 text-[#292D32] cursor-pointer" />
				</div>
			</div>
			<hr />
			<div>
				<div className="flex justify-between py-4">
					<p className="text-[#A5A2B2] font-medium text-sm">{t('common.DESCRIPTION')}</p>
					<button>
						<Image
							src="/assets/svg/edit.svg"
							alt="edit header"
							width={14}
							height={14}
							style={{ height: '14px' }}
							className="cursor-pointer"
						/>
					</button>
				</div>
				<textarea
					className="items-start w-full h-auto pb-4 mt-2 mr-1 text-sm not-italic text-black bg-transparent border border-transparent rounded-md resize-none dark:text-white outline-1 outline-0 scrollbar-hide"
					placeholder={`${t('form.COMPLETION_DESCRIPTION')}....`}
				></textarea>
			</div>
			<hr />
			<div className="my-4">
				<p className="text-[#A5A2B2] font-medium text-sm mb-4">{t('form.ATTACHMENT_FILE')}</p>

				<div
					id="file-upload"
					className="bg-[#F9F9F9] w-full py-4 flex justify-center items-center border border-dashed rounded-md cursor-pointer dark:bg-dark--theme"
				>
					<Image
						src="/assets/svg/file-download.svg"
						alt="edit header"
						width={18}
						height={18}
						style={{ height: '18px' }}
						className="cursor-pointer"
					/>
					<label className="text-sm text-[#A5A2B2] ml-2 cursor-pointer">
						<input type="file" />
						{t('form.UPLOAD_FILES')}
					</label>
				</div>
			</div>
			<hr />
			<div className="my-4">
				<p className="text-[#A5A2B2] font-medium text-sm mb-4">{t('common.LINKS')}</p>
				<div className="bg-[#F9F9F9] w-full py-4 flex justify-center items-center border border-dashed rounded-md cursor-pointer dark:bg-dark--theme">
					<Image
						src="/assets/svg/link2.svg"
						alt="edit header"
						width={18}
						height={18}
						style={{ height: '18px' }}
						className="cursor-pointer"
					/>
					<label className="text-sm text-[#A5A2B2] ml-2 cursor-pointer">{t('common.ADD_LINK')}</label>
				</div>
			</div>
			<hr />
			<div className="my-4 h-36">
				<p className="text-[#A5A2B2] font-medium text-sm mb-4">{t('common.COMMENT')}</p>
				<div className="">
					<input
						className="text-sm text-[#A5A2B2] w-full py-4 bg-[#F9F9F9] border rounded-md outline-0 px-2 dark:bg-dark--theme"
						type="text"
						placeholder={`${t('form.ADD_COMMENT')}...`}
						onClick={() => {
							setIsUpdated(true);
						}}
					/>
					{isUpdated && (
						<div className="flex justify-end mt-2">
							<button
								onClick={() => setIsUpdated(false)}
								className="font-medium transition-all hover:font-semibold"
							>
								{t('common.CANCEL')}
							</button>
							<button className="px-4 py-1 m-2 font-medium text-white transition-all bg-green-500 rounded hover:bg-green-600">
								{t('common.SAVE')}
							</button>
						</div>
					)}
				</div>
			</div>
		</Card>
	);
};

export default CompletionBlock;
