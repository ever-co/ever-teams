import { ChevronUpIcon } from '@heroicons/react/20/solid';
import clsx from 'clsx';
import { Card } from 'lib/components';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { useState } from 'react';

const ActivityBlock = () => {
	const [selectedAll, setSelectedAll] = useState<boolean>(true);
	const [selectedComments, setSelectedComments] = useState<boolean>(false);
	const [selectedHistory, setSelectedHistory] = useState<boolean>(false);
	const [isUpdated, setIsUpdated] = useState<boolean>(false);
	const { t } = useTranslation();
	const onAllSelect = () => {
		setSelectedAll(true);
		setSelectedComments(false);
		setSelectedHistory(false);
	};

	const onCommentsSelect = () => {
		setSelectedAll(false);
		setSelectedComments(true);
		setSelectedHistory(false);
	};

	const onHistorySelect = () => {
		setSelectedAll(false);
		setSelectedComments(false);
		setSelectedHistory(true);
	};

	return (
		<Card className="w-full mt-8" shadow="bigger">
			<div className="flex flex-col justify-between sm:flex-row">
				<div className="flex flex-col sm:flex-row">
					<h4 className="mr-2 text-lg font-semibold">{t('common.ACTIVITY')} </h4>
					<div className="flex ">
						<div
							className={clsx(
								'ml-2 rounded-md text-center h-9 flex justify-center items-center px-4 border cursor-pointer',
								selectedAll ? 'bg-[#E9E9EC]' : 'bg-[#F9F9F9]'
							)}
							onClick={onAllSelect}
						>
							<span
								className={clsx(
									' font-medium text-xs flex items-center',
									selectedAll ? 'text-black' : 'text-[#A5A2B2]'
								)}
							>
								{t('common.FILTER_ALL')}
							</span>
						</div>
						<div
							className={clsx(
								'ml-2 rounded-md text-center h-9 flex justify-center items-center px-4 border cursor-pointer',
								selectedComments ? 'bg-[#E9E9EC]' : 'bg-[#F9F9F9]'
							)}
							onClick={onCommentsSelect}
						>
							<span
								className={clsx(
									' font-medium text-xs flex items-center',
									selectedComments ? 'text-black' : 'text-[#A5A2B2]'
								)}
							>
								{t('common.FILTER_COMMENTS')}
							</span>
						</div>
						<div
							className={clsx(
								'ml-2 rounded-md text-center h-9 flex justify-center items-center px-4 border cursor-pointer',
								selectedHistory ? 'bg-[#E9E9EC]' : 'bg-[#F9F9F9]'
							)}
							onClick={onHistorySelect}
						>
							<span
								className={clsx(
									' font-medium text-xs flex items-center',
									selectedHistory ? 'text-black' : 'text-[#A5A2B2]'
								)}
							>
								{t('common.FILTER_HISTORY')}
							</span>
						</div>
					</div>
				</div>
				<div className="flex items-center">
					<button className="flex items-center justify-center text-[#B1AEBC] text-sm mr-2 mt-4">
						<Image className="mr-1" width={22} height={22} alt="bold" src="/assets/svg/unsubscribe.svg" />{' '}
						{t('common.FILTER_UNSUBSCRIBE')}
					</button>
					<Image src="/assets/svg/line-up.svg" alt="line" width={18} height={18} style={{ height: '18px' }} />
					<ChevronUpIcon className="h-5 w-5 text-[#292D32] cursor-pointer" />
				</div>
			</div>
			<div className="h-32 mt-4">
				<input
					className="text-sm text-[#A5A2B2] w-full py-4 bg-[#F9F9F9] border rounded-md outline-0 px-2 dark:bg-dark--theme"
					type="text"
					placeholder="Add Comment here..."
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
		</Card>
	);
};

export default ActivityBlock;
