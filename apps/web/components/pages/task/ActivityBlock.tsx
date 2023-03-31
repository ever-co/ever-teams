import { useState } from 'react';
import { Card } from 'lib/components';
import clsx from 'clsx';
import { ChevronUpIcon } from '@heroicons/react/20/solid';
import Image from 'next/image';

const ActivityBlock = () => {
	const [selectedAll, setSelectedAll] = useState<boolean>(true);
	const [selectedComments, setSelectedComments] = useState<boolean>(false);
	const [selectedHistory, setSelectedHistory] = useState<boolean>(false);
	const [isUpdated, setIsUpdated] = useState<boolean>(false);

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
			<div className="flex justify-between sm:flex-row flex-col">
				<div className="flex sm:flex-row flex-col">
					<h4 className="text-lg font-semibold mr-2">Activity </h4>
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
								All
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
								Comments
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
								History
							</span>
						</div>
					</div>
				</div>
				<div className="flex items-center">
					<button className="flex items-center justify-center text-[#B1AEBC] text-sm mr-2 mt-4">
						<Image
							className="mr-1"
							width={22}
							height={22}
							alt="bold"
							src="/assets/svg/unsubscribe.svg"
						/>{' '}
						Unsubscribe
					</button>
					<Image
						src="/assets/svg/line-up.svg"
						alt="line"
						width={18}
						height={18}
						style={{ height: '18px' }}
					/>
					<ChevronUpIcon className="h-5 w-5 text-[#292D32] cursor-pointer" />
				</div>
			</div>
			<div className="mt-4 h-32">
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
							Cancel
						</button>
						<button className="bg-green-500 text-white px-4 py-1 m-2 rounded font-medium hover:bg-green-600 transition-all">
							Save
						</button>
					</div>
				)}
			</div>
		</Card>
	);
};

export default ActivityBlock;
